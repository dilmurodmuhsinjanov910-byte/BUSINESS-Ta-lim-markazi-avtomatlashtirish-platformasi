import { Test, TestingModule } from '@nestjs/testing';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';
import { Role, GradeType } from '@prisma/client';

describe('GradesController Security & RBAC', () => {
  let controller: GradesController;
  let service: GradesService;
  let reflector: Reflector;

  const mockGradesService = {
    recordGrade: jest.fn().mockResolvedValue({ id: 'grd-1' }),
    getGroupGrades: jest.fn().mockResolvedValue([]),
    getStudentGrades: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GradesController],
      providers: [
        Reflector,
        { provide: GradesService, useValue: mockGradesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GradesController>(GradesController);
    service = module.get<GradesService>(GradesService);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  it('should have JwtAuthGuard and RolesGuard applied on controller level', () => {
    const guards = Reflect.getMetadata('__guards__', GradesController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('should require TEACHER, ADMIN, or SUPER_ADMIN on recordGrade', () => {
    const roles = reflector.get<Role[]>(ROLES_KEY, controller.recordGrade);
    expect(roles).toEqual([Role.TEACHER, Role.ADMIN, Role.SUPER_ADMIN]);
  });

  it('should populate markedById from req.user.id if not provided in dto', async () => {
    const dto = {
      enrollmentId: 'enr-1',
      score: 90,
      title: 'Speaking Test',
      gradeType: GradeType.CLASSWORK,
    };
    const req = { user: { id: 'teacher-user-456', role: Role.TEACHER } };

    await controller.recordGrade(dto as any, req);
    expect(service.recordGrade).toHaveBeenCalledWith(
      expect.objectContaining({
        markedById: 'teacher-user-456',
      }),
    );
  });
});
