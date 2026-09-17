import { Test, TestingModule } from '@nestjs/testing';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

describe('Teachers Module (Service & Controller)', () => {
  let controller: TeachersController;
  let service: TeachersService;
  let reflector: Reflector;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    group: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeachersController],
      providers: [
        TeachersService,
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TeachersController>(TeachersController);
    service = module.get<TeachersService>(TeachersService);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  describe('Security & RBAC', () => {
    it('should have JwtAuthGuard and RolesGuard on TeachersController', () => {
      const guards = Reflect.getMetadata('__guards__', TeachersController);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('should allow Admin roles to access findAll', () => {
      const roles = reflector.get<Role[]>(ROLES_KEY, controller.findAll);
      expect(roles).toContain(Role.SUPER_ADMIN);
      expect(roles).toContain(Role.ADMIN);
    });

    it('should restrict create and remove to SUPER_ADMIN, ADMIN, OWNER', () => {
      const createRoles = reflector.get<Role[]>(ROLES_KEY, controller.create);
      expect(createRoles).toEqual([Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER]);

      const removeRoles = reflector.get<Role[]>(ROLES_KEY, controller.remove);
      expect(removeRoles).toEqual([Role.SUPER_ADMIN, Role.ADMIN, Role.OWNER]);
    });
  });

  describe('TeachersService Logic', () => {
    it('should list all teachers with their assigned groups', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'tch-1',
          fullName: 'Alisher Ustoz',
          email: 'alisher@test.uz',
          phone: '+998901112233',
          isActive: true,
          branchId: 'br-1',
          branch: { name: 'Chilonzor' },
          createdAt: new Date(),
        },
      ]);
      mockPrisma.group.findMany.mockResolvedValue([
        { id: 'grp-1', name: 'IELTS-301', teacherId: 'tch-1' },
      ]);

      const res = await service.findAll();
      expect(res).toHaveLength(1);
      expect(res[0].fullName).toBe('Alisher Ustoz');
      expect(res[0].assignedGroupsCount).toBe(1);
      expect(res[0].assignedGroups).toContain('IELTS-301');
    });

    it('should create a new teacher with role TEACHER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.branch.findFirst.mockResolvedValue({ id: 'br-1' });
      mockPrisma.user.create.mockResolvedValue({
        id: 'tch-new',
        fullName: 'Nodira Ustoz',
        email: 'nodira@test.uz',
        phone: '+998909998877',
        isActive: true,
        branch: { name: 'Bosh Filial' },
        createdAt: new Date(),
      });

      const res = await service.create({
        fullName: 'Nodira Ustoz',
        email: 'nodira@test.uz',
        phone: '+998909998877',
        password: 'Password123!',
      });

      expect(res.fullName).toBe('Nodira Ustoz');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullName: 'Nodira Ustoz',
            role: Role.TEACHER,
          }),
        }),
      );
    });

    it('should unassign groups and delete teacher on remove', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'tch-del',
        fullName: 'Delete Me',
        role: Role.TEACHER,
        branch: null,
      });
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.group.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.delete.mockResolvedValue({ id: 'tch-del' });

      const res = await service.remove('tch-del');
      expect(res.success).toBe(true);
      expect(mockPrisma.group.updateMany).toHaveBeenCalledWith({
        where: { teacherId: 'tch-del' },
        data: { teacherId: null },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'tch-del' },
      });
    });
  });
});
