import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';
import { Role, AttendanceStatus } from '@prisma/client';

describe('AttendanceController Security & RBAC', () => {
  let controller: AttendanceController;
  let service: AttendanceService;
  let reflector: Reflector;

  const mockAttendanceService = {
    recordAttendance: jest.fn().mockResolvedValue({ savedCount: 1 }),
    getGroupAttendance: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        Reflector,
        { provide: AttendanceService, useValue: mockAttendanceService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttendanceController>(AttendanceController);
    service = module.get<AttendanceService>(AttendanceService);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  it('should have JwtAuthGuard and RolesGuard applied on controller level', () => {
    const guards = Reflect.getMetadata('__guards__', AttendanceController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('should require TEACHER, ADMIN, or SUPER_ADMIN on recordAttendance', () => {
    const roles = reflector.get<Role[]>(ROLES_KEY, controller.recordAttendance);
    expect(roles).toEqual([Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN]);
  });

  it('should require TEACHER, ADMIN, or SUPER_ADMIN on getGroupAttendance', () => {
    const roles = reflector.get<Role[]>(ROLES_KEY, controller.getGroupAttendance);
    expect(roles).toEqual([Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN]);
  });

  it('should populate markedById from req.user.id if not provided in dto', async () => {
    const dto = {
      groupId: 'grp-1',
      date: '2026-09-17',
      records: [{ enrollmentId: 'enr-1', status: AttendanceStatus.PRESENT }],
    };
    const req = { user: { id: 'teacher-user-123', role: Role.TEACHER } };

    await controller.recordAttendance(dto as any, req);
    expect(service.recordAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        markedById: 'teacher-user-123',
      }),
    );
  });
});
