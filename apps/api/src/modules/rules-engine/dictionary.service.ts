import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

const GENERIC_FALLBACK = 'Resultado registrado. El clínico debe redactar la interpretación de este puntaje.';

@Injectable()
export class DictionaryService {
  constructor(private readonly prisma: PrismaService) {}

  async lookup(code: string, variables: Record<string, string> = {}): Promise<string> {
    // Try exact code
    let entry = await this.prisma.clinicalDictionary.findUnique({ where: { code, isActive: true } as never });

    // Fallback: replace last segment with "default"
    if (!entry) {
      const parts = code.split('.');
      if (parts.length >= 2) {
        const defaultCode = [...parts.slice(0, -1), 'default'].join('.');
        entry = await this.prisma.clinicalDictionary.findUnique({ where: { code: defaultCode, isActive: true } as never });
      }
    }

    const template = entry?.content ?? GENERIC_FALLBACK;
    return this.interpolate(template, variables);
  }

  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }
}
