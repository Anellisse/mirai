import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export type NormativeInput = {
  slotId: string;
  rawScore: number;
  age?: number;
  educationYears?: number;
  gender?: string;
};

export type NormativeResult = {
  standardScore: number;
  scoreType: string;
  percentile?: number;
};

@Injectable()
export class NormativeService {
  constructor(private readonly prisma: PrismaService) {}

  async convert(input: NormativeInput): Promise<NormativeResult | null> {
    const slot = await this.prisma.testScoreSlot.findUnique({ where: { id: input.slotId } });
    if (!slot) return null;

    // If no conversion required, treat raw as already standardized
    if (!slot.requiresConversion) {
      return { standardScore: input.rawScore, scoreType: slot.scoreType };
    }

    const tables = await this.prisma.normativeTable.findMany({
      where: { slotId: input.slotId, isActive: true },
      include: { entries: true },
    });

    if (!tables.length) return null;

    const table = tables[0];

    // Filter entries by demographic match, with fallbacks
    let entry = this.findEntry(table.entries, input);

    // Fallback 1: ignore education
    if (!entry && input.educationYears !== undefined) {
      entry = this.findEntry(table.entries, { ...input, educationYears: undefined });
    }

    // Fallback 2: ignore gender
    if (!entry && input.gender) {
      entry = this.findEntry(table.entries, { ...input, gender: undefined });
    }

    // Fallback 3: any entry in age range ignoring all demographics
    if (!entry) {
      entry = this.findEntry(table.entries, { slotId: input.slotId, rawScore: input.rawScore });
    }

    if (!entry) return null;

    if (table.tableType === 'lookup') {
      if (entry.standardScore === null || entry.standardScore === undefined) return null;
      return {
        standardScore: entry.standardScore,
        scoreType: slot.scoreType,
        percentile: entry.percentile ?? undefined,
      };
    }

    if (table.tableType === 'formula') {
      const params = entry.parameters as Record<string, number>;
      let std: number;

      if (entry.formulaType === 'z_transform') {
        std = (input.rawScore - params.mean) / params.sd;
        if (slot.isInverse) std = -std;
      } else if (entry.formulaType === 'linear') {
        std = params.slope * input.rawScore + params.intercept;
      } else {
        return null;
      }

      return { standardScore: std, scoreType: slot.scoreType };
    }

    return null;
  }

  private findEntry(
    entries: Array<{
      ageMin: number | null; ageMax: number | null;
      educationYearsMin: number | null; educationYearsMax: number | null;
      gender: string | null;
      rawScoreMin: number | null; rawScoreMax: number | null;
      standardScore: number | null; percentile: number | null;
      formulaType: string | null; parameters: unknown;
    }>,
    input: Partial<NormativeInput>,
  ) {
    return entries.find((e) => {
      if (input.age !== undefined && e.ageMin !== null && e.ageMax !== null) {
        if (input.age < e.ageMin || input.age > e.ageMax) return false;
      }
      if (input.educationYears !== undefined && e.educationYearsMin !== null && e.educationYearsMax !== null) {
        if (input.educationYears < e.educationYearsMin || input.educationYears > e.educationYearsMax) return false;
      }
      if (input.gender && e.gender !== null && e.gender !== input.gender) return false;
      if (input.rawScore !== undefined && e.rawScoreMin !== null && e.rawScoreMax !== null) {
        if (input.rawScore < e.rawScoreMin || input.rawScore > e.rawScoreMax) return false;
      }
      return true;
    }) ?? null;
  }
}
