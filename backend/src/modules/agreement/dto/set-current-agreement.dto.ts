import { IsInt, Min } from 'class-validator';

export class SetCurrentAgreementDto {
  @IsInt()
  @Min(1)
  version!: number;
}
