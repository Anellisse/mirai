import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export type DescriptorInput = {
  standardScore: number;
  scaleCode: string;
  isInverse?: boolean;
};

export type DescriptorResult = {
  label: string;
  labelShort: string;
};

@Injectable()
export class DescriptorService {
  constructor(private readonly prisma: PrismaService) {}

  async describe(input: DescriptorInput): Promise<DescriptorResult> {
    const ranges = await this.prisma.descriptorRange.findMany({
      where: { scaleCode: input.scaleCode },
      orderBy: { orderIndex: 'asc' },
    });

    if (!ranges.length) {
      return { label: 'Sin descriptor', labelShort: 'SD' };
    }

    const score = input.isInverse ? -input.standardScore : input.standardScore;

    // Find exact range match
    const match = ranges.find((r) => score >= r.minScore && score <= r.maxScore);
    if (match) return { label: match.label, labelShort: match.labelShort };

    // Clamp to nearest extreme
    if (score < ranges[0].minScore) return { label: ranges[0].label, labelShort: ranges[0].labelShort };
    return { label: ranges[ranges.length - 1].label, labelShort: ranges[ranges.length - 1].labelShort };
  }
}
