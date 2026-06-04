import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        kycStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            city: true,
            state: true,
            country: true,
          },
        },
        trustScore: { select: { score: true, level: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: Prisma.UserProfileUpdateInput = {};

    // Merge first + last name into fullName
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const current = await this.prisma.userProfile.findUnique({
        where: { userId },
        select: { fullName: true },
      });
      const parts = (current?.fullName ?? '').split(' ');
      const curFirst = parts[0] ?? '';
      const curLast = parts.slice(1).join(' ');

      const newFirst = dto.firstName !== undefined ? dto.firstName : curFirst;
      const newLast = dto.lastName !== undefined ? dto.lastName : curLast;
      updateData.fullName = [newFirst, newLast].filter(Boolean).join(' ') || newFirst;
    }

    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.birthDate !== undefined) updateData.birthDate = new Date(dto.birthDate);

    return this.prisma.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        fullName: (updateData.fullName as string | undefined) ?? 'User',
        displayName: updateData.displayName as string | undefined,
        avatarUrl: updateData.avatarUrl as string | undefined,
        bio: updateData.bio as string | undefined,
        birthDate: updateData.birthDate as Date | undefined,
      },
    });
  }
}
