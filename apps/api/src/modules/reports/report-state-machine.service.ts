import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ReportStatus, SectionStatus, GeneratedBy } from '@prisma/client';
import { UserPayload, Role } from '@mirai/shared-types';

export type TransitionAction = 'start' | 'submit' | 'approve' | 'export' | 'finalize';

interface ReportWithSections {
  id: string;
  authorId: string;
  supervisorId: string | null;
  status: ReportStatus;
  sections: Array<{ sectionType: string; generatedBy: GeneratedBy; status: SectionStatus; content: string | null }>;
  finalReport: { id: string } | null;
}

const REQUIRED_BEFORE_REVIEW = [
  'CONSULTATION_REASON',
  'BACKGROUND',
  'OBSERVED_BEHAVIOR',
  'CONCLUSIONS',
] as const;

const SECTION_LABEL: Record<string, string> = {
  CONSULTATION_REASON: 'Motivo de consulta',
  BACKGROUND: 'Antecedentes relevantes',
  OBSERVED_BEHAVIOR: 'Conducta observada',
  CONCLUSIONS: 'Conclusiones',
};

const SENIOR_OR_ABOVE: Role[] = [Role.CLINICO_SENIOR, Role.ADMIN, Role.SUPER_ADMIN];

@Injectable()
export class ReportStateMachineService {
  transition(report: ReportWithSections, action: TransitionAction, user: UserPayload): ReportStatus {
    const isAuthor = report.authorId === user.sub;
    const isSupervisor = !!report.supervisorId && report.supervisorId === user.sub;
    const isAuthorOrSupervisor = isAuthor || isSupervisor;
    const isSeniorOrAbove = SENIOR_OR_ABOVE.includes(user.role);

    switch (report.status) {
      case ReportStatus.DRAFT: {
        if (action !== 'start') this.invalidTransition(report.status, action);
        if (!isAuthor) throw new ForbiddenException('Solo el autor puede iniciar el informe');
        return ReportStatus.IN_PROGRESS;
      }

      case ReportStatus.IN_PROGRESS: {
        if (action !== 'submit') this.invalidTransition(report.status, action);
        if (!isAuthor) throw new ForbiddenException('Solo el autor puede enviar a revisión');
        this.assertCoreSectionsFilled(report);
        this.assertNoUnreviewedAiSections(report);
        return ReportStatus.REVIEW;
      }

      case ReportStatus.REVIEW: {
        if (action === 'submit') {
          if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para avanzar');
          if (!report.supervisorId)
            throw new ConflictException('No hay supervisor asignado para enviar a revisión supervisada');
          return ReportStatus.SUPERVISOR_REVIEW;
        }
        if (action === 'approve') {
          if (!isSeniorOrAbove) throw new ForbiddenException('Se requiere rol Clínico Senior o superior');
          if (report.supervisorId)
            throw new ConflictException('El informe tiene supervisor asignado: debe pasar por revisión supervisada');
          return ReportStatus.APPROVED;
        }
        this.invalidTransition(report.status, action);
      }

      case ReportStatus.SUPERVISOR_REVIEW: {
        if (action !== 'approve') this.invalidTransition(report.status, action);
        if (!isSupervisor) throw new ForbiddenException('Solo el supervisor asignado puede aprobar');
        return ReportStatus.APPROVED;
      }

      case ReportStatus.APPROVED: {
        if (action !== 'export') this.invalidTransition(report.status, action);
        if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para exportar');
        return ReportStatus.EXPORTED;
      }

      case ReportStatus.EXPORTED: {
        if (action !== 'finalize') this.invalidTransition(report.status, action);
        if (!isAuthorOrSupervisor) throw new ForbiddenException('Sin permiso para finalizar');
        if (!report.finalReport)
          throw new ConflictException('Debe existir un informe final antes de finalizar');
        return ReportStatus.FINAL;
      }

      default:
        throw new ConflictException(`El informe en estado ${report.status} no admite transiciones`);
    }
  }

  private assertCoreSectionsFilled(report: ReportWithSections): void {
    const empty = REQUIRED_BEFORE_REVIEW.filter((type) => {
      const section = report.sections.find((s) => s.sectionType === type);
      return !section || section.status === SectionStatus.PENDING || !section.content;
    });
    if (empty.length > 0) {
      const names = empty.map((t) => SECTION_LABEL[t] ?? t).join(', ');
      throw new UnprocessableEntityException(
        `No se puede enviar a revisión: faltan completar — ${names}`,
      );
    }
  }

  private assertNoUnreviewedAiSections(report: ReportWithSections): void {
    const pending = report.sections.filter(
      (s) => s.generatedBy === GeneratedBy.AI && s.status === SectionStatus.AI_GENERATED,
    );
    if (pending.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Hay secciones generadas por IA sin revisar',
        pendingSections: pending,
      });
    }
  }

  private invalidTransition(status: ReportStatus, action: string): never {
    throw new ConflictException(`Acción '${action}' no válida para informe en estado ${status}`);
  }
}
