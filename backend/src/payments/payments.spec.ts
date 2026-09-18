import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { PaymentStatus, PaymentMethod, LeadStatus, EnrollmentStatus, Role } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';

describe('Payments & Invoicing Service & Controller', () => {
  let service: PaymentsService;
  let controller: PaymentsController;
  let reflector: Reflector;

  const mockTelegramService = {
    sendPaymentReceiptAlert: jest.fn().mockResolvedValue(true),
    sendPaymentReminderAlert: jest.fn().mockResolvedValue(true),
  };

  const mockPrisma: any = {
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trialBooking: {
      findFirst: jest.fn(),
    },
    leadActivity: {
      create: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelegramService, useValue: mockTelegramService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    service = module.get<PaymentsService>(PaymentsService);
    controller = module.get<PaymentsController>(PaymentsController);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  describe('PaymentsService - Basic Operations', () => {
    it('should find all payments with optional status filter', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([
        { id: 'p-1', amount: 500000, status: PaymentStatus.PAID },
      ]);

      const result = await service.findAll(PaymentStatus.PAID);
      expect(result).toHaveLength(1);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { status: PaymentStatus.PAID },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should create pending payment for valid lead', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({ id: 'lead-1', fullName: 'Vali' });
      mockPrisma.payment.create.mockResolvedValue({
        id: 'p-new',
        leadId: 'lead-1',
        amount: 600000,
        status: PaymentStatus.PENDING,
      });

      const dto: CreatePaymentDto = {
        leadId: 'lead-1',
        amount: 600000,
        method: PaymentMethod.CASH,
      };

      const result = await service.create(dto, 'admin-1');
      expect(result.id).toBe('p-new');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 600000,
            status: PaymentStatus.PENDING,
          }),
        }),
      );
    });

    it('should mark payment as PAID, update lead to WON, and send receipt notification', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'p-123456',
        leadId: 'lead-1',
        amount: 700000,
        currency: 'UZS',
        method: PaymentMethod.CLICK,
        lead: {
          id: 'lead-1',
          fullName: 'Sardor Rahim',
          telegramId: 'tg-999',
        },
      });

      mockPrisma.payment.update.mockResolvedValue({
        id: 'p-123456',
        leadId: 'lead-1',
        amount: 700000,
        status: PaymentStatus.PAID,
        method: PaymentMethod.CLICK,
        lead: { id: 'lead-1', fullName: 'Sardor Rahim', telegramId: 'tg-999' },
      });

      mockPrisma.trialBooking.findFirst.mockResolvedValue(null);

      const res = await service.markAsPaid('p-123456', 'cashier-1');

      expect(res.status).toBe(PaymentStatus.PAID);
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: expect.objectContaining({ status: LeadStatus.WON, score: 100 }),
      });
      expect(mockTelegramService.sendPaymentReceiptAlert).toHaveBeenCalledWith(
        'tg-999',
        'Sardor Rahim',
        700000,
        'INV-123456',
        PaymentMethod.CLICK,
        expect.any(String),
        undefined,
      );
    });

    it('should create and pay directly (one-step checkout) with telegram alert', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead-direct',
        fullName: 'Botir Zokirov',
        telegramId: 'tg-botir',
      });

      mockPrisma.payment.create.mockResolvedValue({
        id: 'p-direct-99',
        leadId: 'lead-direct',
        amount: 850000,
        currency: 'UZS',
        method: PaymentMethod.PAYME,
        status: PaymentStatus.PAID,
        lead: { id: 'lead-direct', fullName: 'Botir Zokirov', telegramId: 'tg-botir' },
      });

      const res = await service.createAndPay({
        leadId: 'lead-direct',
        amount: 850000,
        method: PaymentMethod.PAYME,
        notes: 'Payme orqali to\'landi',
      });

      expect(res.status).toBe(PaymentStatus.PAID);
      expect(mockTelegramService.sendPaymentReceiptAlert).toHaveBeenCalled();
    });
  });

  describe('PaymentsService - Financial Summary & Debtors', () => {
    it('should aggregate financial summary correctly', async () => {
      const now = new Date();
      mockPrisma.payment.findMany.mockResolvedValue([
        { amount: 500000, method: PaymentMethod.CASH, paidAt: now, status: PaymentStatus.PAID },
        { amount: 700000, method: PaymentMethod.CLICK, paidAt: now, status: PaymentStatus.PAID },
        { amount: 300000, method: PaymentMethod.PAYME, paidAt: now, status: PaymentStatus.PAID },
      ]);

      mockPrisma.enrollment.findMany.mockResolvedValue([
        { id: 'enr-1', monthlyFee: 800000, status: EnrollmentStatus.ACTIVE },
        { id: 'enr-2', monthlyFee: 900000, status: EnrollmentStatus.ACTIVE },
      ]);

      const summary = await service.getSummary();

      expect(summary.totalRevenue).toBe(1500000);
      expect(summary.monthlyRevenue).toBe(1500000);
      expect(summary.totalPaymentsCount).toBe(3);
      expect(summary.activeStudentsCount).toBe(2);
      expect(summary.methodBreakdown.CASH).toBe(500000);
      expect(summary.methodBreakdown.CLICK).toBe(700000);
      expect(summary.methodBreakdown.PAYME).toBe(300000);
      expect(summary.totalDebts).toBe(200000);
    });

    it('should compute debtors list accurately based on active enrollments and paid payments', async () => {
      const now = new Date();
      mockPrisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'enr-10',
          monthlyFee: 600000,
          status: EnrollmentStatus.ACTIVE,
          lead: {
            id: 'lead-deb-1',
            fullName: 'Qarzdor Talaba',
            phone: '+998901112233',
            telegramId: 'tg-deb-1',
            payments: [
              { amount: 200000, paidAt: now, status: PaymentStatus.PAID },
            ],
          },
          group: {
            name: 'IELTS-A',
            course: { name: 'IELTS Intensive' },
            branch: { name: 'Chilonzor' },
          },
        },
        {
          id: 'enr-11',
          monthlyFee: 500000,
          status: EnrollmentStatus.ACTIVE,
          lead: {
            id: 'lead-clean',
            fullName: 'To\'liq To\'lagan',
            phone: '+998904445566',
            telegramId: 'tg-clean',
            payments: [
              { amount: 500000, paidAt: now, status: PaymentStatus.PAID },
            ],
          },
          group: {
            name: 'ENG-1',
            course: { name: 'General English' },
            branch: { name: 'Yunusobod' },
          },
        },
      ]);

      const debtors = await service.getDebtors();

      expect(debtors).toHaveLength(1);
      expect(debtors[0].fullName).toBe('Qarzdor Talaba');
      expect(debtors[0].monthlyFee).toBe(600000);
      expect(debtors[0].paidThisMonth).toBe(200000);
      expect(debtors[0].remainingDebt).toBe(400000);
    });

    it('should generate official structured receipt for print and invoice', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'cmu6abcdef123456',
        amount: 600000,
        currency: 'UZS',
        status: PaymentStatus.PAID,
        method: PaymentMethod.CASH,
        paidAt: new Date('2026-09-17T12:00:00Z'),
        notes: 'Oylik to\'lov qabul qilindi',
        lead: {
          id: 'lead-rcpt',
          fullName: 'Nodirbek Aliyev',
          phone: '+998971234567',
          telegramId: 'tg-nodir',
          enrollments: [
            {
              group: {
                name: 'ENG-BEG-101',
                course: { name: 'General English (Beginner)' },
                branch: { name: 'Chilonzor filiali' },
              },
            },
          ],
        },
      });

      const receipt = await service.getReceipt('cmu6abcdef123456');

      expect(receipt.receiptNumber).toBe('INV-123456');
      expect(receipt.amount).toBe(600000);
      expect(receipt.student.fullName).toBe('Nodirbek Aliyev');
      expect(receipt.course).toBe('General English (Beginner)');
      expect(receipt.organization.name).toContain('Al-Xorazmiy');
      expect(receipt.cashier).toBe('Bosh Administrator');
    });

    it('should notify debtor via Telegram and log LeadActivity', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead-notif',
        fullName: 'Jasur Bek',
        telegramId: 'tg-jasur-77',
        enrollments: [
          {
            status: EnrollmentStatus.ACTIVE,
            monthlyFee: 550000,
            group: {
              name: 'MATH-101',
              course: { name: 'Oliy Matematika' },
            },
          },
        ],
      });

      mockPrisma.leadActivity.create.mockResolvedValue({ id: 'act-1' });

      const result = await service.notifyDebtor('lead-notif', 'admin-caller');

      expect(result.success).toBe(true);
      expect(mockTelegramService.sendPaymentReminderAlert).toHaveBeenCalledWith(
        'tg-jasur-77',
        'Jasur Bek',
        'MATH-101',
        'Oliy Matematika',
        550000,
        expect.any(String),
      );
      expect(mockPrisma.leadActivity.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when notifying a debtor without Telegram ID', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue({
        id: 'lead-no-tg',
        fullName: 'Telefon O\'quvchi',
        telegramId: null,
        enrollments: [],
      });

      await expect(service.notifyDebtor('lead-no-tg')).rejects.toThrow(BadRequestException);
    });
  });

  describe('PaymentsController Security & RBAC', () => {
    it('should apply JwtAuthGuard and RolesGuard on controller level', () => {
      const guards = Reflect.getMetadata('__guards__', PaymentsController);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('should protect getSummary with administrative roles', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getSummary);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT]);
    });

    it('should protect getDebtors with administrative roles', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.getDebtors);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT]);
    });

    it('should protect direct-pay with administrative roles', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.createAndPay);
      expect(roles).toEqual([Role.SUPER_ADMIN, Role.OWNER, Role.ADMIN, Role.ACCOUNTANT]);
    });
  });
});
