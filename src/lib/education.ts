export type EducationStage =
  | 'primary_1'
  | 'primary_2'
  | 'primary_3'
  | 'primary_4'
  | 'primary_5'
  | 'primary_6'
  | 'preparatory_1'
  | 'preparatory_2'
  | 'preparatory_3'
  | 'secondary_1'
  | 'secondary_2'
  | 'secondary_3';

export type Curriculum = 'national' | 'languages' | 'azhar' | 'international' | 'institutes' | 'technical';

export const educationStages: Array<{ value: EducationStage; label: string; group: string }> = [
  { value: 'primary_1', label: 'الصف الأول الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'primary_2', label: 'الصف الثاني الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'primary_3', label: 'الصف الثالث الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'primary_4', label: 'الصف الرابع الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'primary_5', label: 'الصف الخامس الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'primary_6', label: 'الصف السادس الابتدائي', group: 'المرحلة الابتدائية' },
  { value: 'preparatory_1', label: 'الصف الأول الإعدادي', group: 'المرحلة الإعدادية' },
  { value: 'preparatory_2', label: 'الصف الثاني الإعدادي', group: 'المرحلة الإعدادية' },
  { value: 'preparatory_3', label: 'الصف الثالث الإعدادي', group: 'المرحلة الإعدادية' },
  { value: 'secondary_1', label: 'الصف الأول الثانوي', group: 'المرحلة الثانوية' },
  { value: 'secondary_2', label: 'الصف الثاني الثانوي', group: 'المرحلة الثانوية' },
  { value: 'secondary_3', label: 'الصف الثالث الثانوي', group: 'المرحلة الثانوية' },
];

export const curricula: Array<{ value: Curriculum; label: string }> = [
  { value: 'national', label: 'مدارس حكومي' },
  { value: 'languages', label: 'مدارس لغات' },
  { value: 'azhar', label: 'معاهد أزهرية' },
  { value: 'international', label: 'مدارس دولية' },
  { value: 'institutes', label: 'معاهد خاصة' },
  { value: 'technical', label: 'التعليم الفني' },
];

export const getStagesForCurriculum = (curriculum?: string | null) => {
  if (!curriculum) return [];
  return educationStages.map((stage) => {
    if (curriculum === 'international') {
      return { ...stage, label: `Grade ${stage.value.split('_')[1]} - ${stage.group.replace('المرحلة ', '')}` };
    }
    if (curriculum === 'azhar') return { ...stage, label: `${stage.label} الأزهري` };
    if (curriculum === 'institutes') return { ...stage, label: `${stage.label} بالمعاهد` };
    if (curriculum === 'technical' && stage.group === 'المرحلة الثانوية') {
      return { ...stage, label: `${stage.label} فني` };
    }
    return stage;
  });
};

export const getEducationStageLabel = (value?: string | null) =>
  educationStages.find((stage) => stage.value === value)?.label ?? 'كل المراحل';

export const getCurriculumLabel = (value?: string | null) =>
  curricula.find((item) => item.value === value)?.label ?? 'كل المناهج';
