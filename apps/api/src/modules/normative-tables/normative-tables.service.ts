import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateNormativeTableDto, FormulaEntry, TableType } from './dto/create-normative-table.dto';

type CsvRow = {
  ageMin?: string; ageMax?: string;
  educationYearsMin?: string; educationYearsMax?: string;
  gender?: string;
  rawScoreMin?: string; rawScoreMax?: string;
  standardScore?: string; percentile?: string;
};

@Injectable()
export class NormativeTablesService {
  constructor(private readonly prisma: PrismaService) {}

  findBySlot(slotId: string) {
    return this.prisma.normativeTable.findMany({
      where: { slotId, isActive: true },
      include: { entries: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateNormativeTableDto, csvBuffer?: Buffer) {
    const table = await this.prisma.normativeTable.create({
      data: {
        slotId: dto.slotId,
        name: dto.name,
        source: dto.source,
        demographicVariables: dto.demographicVariables,
        tableType: dto.tableType,
      },
    });

    if (dto.tableType === TableType.LOOKUP && csvBuffer) {
      const entries = this.parseCsv(csvBuffer);
      await this.prisma.normativeEntry.createMany({
        data: entries.map((e) => ({ tableId: table.id, ...e })),
      });
    } else if (dto.tableType === TableType.FORMULA && dto.entries?.length) {
      await this.prisma.normativeEntry.createMany({
        data: dto.entries.map((e: FormulaEntry) => ({ tableId: table.id, ...e })),
      });
    }

    return this.prisma.normativeTable.findUnique({
      where: { id: table.id },
      include: { entries: true },
    });
  }

  async update(id: string, dto: Partial<CreateNormativeTableDto>, csvBuffer?: Buffer) {
    const table = await this.prisma.normativeTable.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Tabla normativa no encontrada');

    await this.prisma.normativeTable.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.demographicVariables && { demographicVariables: dto.demographicVariables }),
      },
    });

    if (csvBuffer) {
      await this.prisma.normativeEntry.deleteMany({ where: { tableId: id } });
      const entries = this.parseCsv(csvBuffer);
      await this.prisma.normativeEntry.createMany({
        data: entries.map((e) => ({ tableId: id, ...e })),
      });
    } else if (dto.entries?.length) {
      await this.prisma.normativeEntry.deleteMany({ where: { tableId: id } });
      await this.prisma.normativeEntry.createMany({
        data: dto.entries.map((e: FormulaEntry) => ({ tableId: id, ...e })),
      });
    }

    return this.prisma.normativeTable.findUnique({ where: { id }, include: { entries: true } });
  }

  async deactivate(id: string) {
    const table = await this.prisma.normativeTable.findUnique({ where: { id } });
    if (!table) throw new NotFoundException('Tabla normativa no encontrada');
    return this.prisma.normativeTable.update({ where: { id }, data: { isActive: false } });
  }

  private parseCsv(buffer: Buffer): Record<string, number | string | null>[] {
    const text = buffer.toString('utf-8');
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: CsvRow = {};
      headers.forEach((h, i) => {
        (row as Record<string, string>)[h] = values[i] ?? '';
      });

      const toIntOrNull = (v?: string) => (v && v !== '' ? parseInt(v, 10) : null);
      const toFloatOrNull = (v?: string) => (v && v !== '' ? parseFloat(v) : null);

      return {
        ageMin: toIntOrNull(row.ageMin),
        ageMax: toIntOrNull(row.ageMax),
        educationYearsMin: toIntOrNull(row.educationYearsMin),
        educationYearsMax: toIntOrNull(row.educationYearsMax),
        gender: row.gender && row.gender !== '' ? row.gender : null,
        rawScoreMin: toFloatOrNull(row.rawScoreMin),
        rawScoreMax: toFloatOrNull(row.rawScoreMax),
        standardScore: toFloatOrNull(row.standardScore),
        percentile: toFloatOrNull(row.percentile),
      };
    });
  }
}
