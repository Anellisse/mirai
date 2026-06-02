import { NotFoundException } from '@nestjs/common';
import { NormativeTablesService } from '../normative-tables.service';
import { TableType } from '../dto/create-normative-table.dto';

const mockTable = {
  id: 'tbl1', slotId: 'slot1', name: 'Tabla TMT-A adultos', source: null,
  demographicVariables: ['age'], tableType: 'lookup', isActive: true, createdAt: new Date(),
};

function makePrisma(table = mockTable) {
  return {
    normativeTable: {
      findMany: jest.fn().mockResolvedValue([table]),
      findUnique: jest.fn().mockResolvedValue({ ...table, entries: [] }),
      create: jest.fn().mockResolvedValue(table),
      update: jest.fn().mockResolvedValue(table),
    },
    normativeEntry: {
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

const CSV_CONTENT = `ageMin,ageMax,educationYearsMin,educationYearsMax,gender,rawScoreMin,rawScoreMax,standardScore,percentile
20,29,,,,30,35,-1.5,7
20,29,,,,36,42,-1.0,16`;

describe('NormativeTablesService', () => {
  describe('findBySlot', () => {
    it('returns active tables for a slot', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      const result = await service.findBySlot('slot1');
      expect(prisma.normativeTable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slotId: 'slot1', isActive: true } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('creates lookup table and parses CSV entries', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      const dto = { slotId: 'slot1', name: 'Tabla', demographicVariables: ['age'], tableType: TableType.LOOKUP };
      await service.create(dto, Buffer.from(CSV_CONTENT));
      expect(prisma.normativeTable.create).toHaveBeenCalled();
      expect(prisma.normativeEntry.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ rawScoreMin: 30, standardScore: -1.5 })]) }),
      );
    });

    it('creates formula table from entries in body', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      const dto = {
        slotId: 'slot1', name: 'Tabla formula', demographicVariables: ['age'], tableType: TableType.FORMULA,
        entries: [{ ageMin: 20, ageMax: 29, formulaType: 'z_transform', parameters: { mean: 85.3, sd: 12.1 } }],
      };
      await service.create(dto);
      expect(prisma.normativeEntry.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ formulaType: 'z_transform' })]) }),
      );
    });
  });

  describe('update', () => {
    it('replaces entries when CSV is provided', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      await service.update('tbl1', { name: 'Tabla actualizada' }, Buffer.from(CSV_CONTENT));
      expect(prisma.normativeEntry.deleteMany).toHaveBeenCalledWith({ where: { tableId: 'tbl1' } });
      expect(prisma.normativeEntry.createMany).toHaveBeenCalled();
    });

    it('throws NotFoundException when table does not exist', async () => {
      const prisma = makePrisma();
      prisma.normativeTable.findUnique = jest.fn().mockResolvedValue(null);
      const service = new NormativeTablesService(prisma as any);
      await expect(service.update('missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      await service.deactivate('tbl1');
      expect(prisma.normativeTable.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('throws NotFoundException when table does not exist', async () => {
      const prisma = makePrisma();
      prisma.normativeTable.findUnique = jest.fn().mockResolvedValue(null);
      const service = new NormativeTablesService(prisma as any);
      await expect(service.deactivate('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('CSV parsing', () => {
    it('handles empty optional columns as null', async () => {
      const prisma = makePrisma();
      const service = new NormativeTablesService(prisma as any);
      const dto = { slotId: 'slot1', name: 'T', demographicVariables: [], tableType: TableType.LOOKUP };
      await service.create(dto, Buffer.from(CSV_CONTENT));
      const createManyCall = (prisma.normativeEntry.createMany as jest.Mock).mock.calls[0][0];
      expect(createManyCall.data[0].educationYearsMin).toBeNull();
      expect(createManyCall.data[0].gender).toBeNull();
    });
  });
});
