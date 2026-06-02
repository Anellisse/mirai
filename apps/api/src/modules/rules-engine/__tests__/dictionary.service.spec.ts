import { DictionaryService } from '../dictionary.service';

const ENTRIES: Record<string, { code: string; content: string; isActive: boolean }> = {
  'WISC5.ICV.medio': { code: 'WISC5.ICV.medio', content: 'El ICV de {{paciente}} es Medio (SS = {{puntaje}}; Pc {{percentil}}).', isActive: true },
  'WISC5.ICV.default': { code: 'WISC5.ICV.default', content: 'El ICV de {{paciente}} obtuvo puntaje {{puntaje}}.', isActive: true },
  'SINTESIS.SNP_CHC.base': { code: 'SINTESIS.SNP_CHC.base', content: 'En síntesis, {{paciente}} muestra {{dominios_afectados}}.', isActive: true },
};

function makePrisma() {
  return {
    clinicalDictionary: {
      findUnique: jest.fn(({ where }: { where: { code: string } }) =>
        Promise.resolve(ENTRIES[where.code] ?? null),
      ),
    },
  };
}

describe('DictionaryService', () => {
  it('returns interpolated text for exact code match', async () => {
    const service = new DictionaryService(makePrisma() as any);
    const result = await service.lookup('WISC5.ICV.medio', { paciente: 'el paciente', puntaje: '100', percentil: '50' });
    expect(result).toBe('El ICV de el paciente es Medio (SS = 100; Pc 50).');
  });

  it('falls back to .default entry when exact code not found', async () => {
    const service = new DictionaryService(makePrisma() as any);
    const result = await service.lookup('WISC5.ICV.extremadamente_bajo', { paciente: 'Ana', puntaje: '60' });
    expect(result).toBe('El ICV de Ana obtuvo puntaje 60.');
  });

  it('returns generic fallback when neither exact nor default exists', async () => {
    const service = new DictionaryService(makePrisma() as any);
    const result = await service.lookup('MISSING.CODE.descriptor', {});
    expect(result).toContain('clínico debe redactar');
  });

  it('leaves unreplaced placeholders intact when variable not provided', async () => {
    const service = new DictionaryService(makePrisma() as any);
    const result = await service.lookup('WISC5.ICV.medio', { paciente: 'Juan' });
    expect(result).toContain('{{puntaje}}');
    expect(result).toContain('{{percentil}}');
  });

  it('interpolates synthesis template with multiple variables', async () => {
    const service = new DictionaryService(makePrisma() as any);
    const result = await service.lookup('SINTESIS.SNP_CHC.base', {
      paciente: 'el paciente',
      dominios_afectados: 'compromisos en funciones ejecutivas y velocidad de procesamiento',
    });
    expect(result).toContain('compromisos en funciones ejecutivas');
  });
});
