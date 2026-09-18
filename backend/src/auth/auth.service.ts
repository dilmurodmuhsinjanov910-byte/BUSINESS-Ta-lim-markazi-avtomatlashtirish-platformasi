import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export { RegisterDto, LoginDto };

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('Bunday email bilan foydalanuvchi allaqachon mavjud');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName,
        role: dto.role || Role.ADMIN,
        phone: dto.phone,
        branchId: dto.branchId,
      },
    });

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri, yoki hisob faol emas');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      accessToken: token,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { branch: true },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  private generateToken(user: { id: string; email: string; role: Role }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }
}
