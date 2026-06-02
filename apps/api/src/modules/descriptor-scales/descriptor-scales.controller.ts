import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DescriptorScalesService } from './descriptor-scales.service';

@Controller('descriptor-scales')
@UseGuards(JwtAuthGuard)
export class DescriptorScalesController {
  constructor(private readonly service: DescriptorScalesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.service.findOne(code);
  }
}
