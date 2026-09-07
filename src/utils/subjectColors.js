export const SUBJECT_COLORS = {
  biologie: '#4CAF82',
  chemie: '#E07B54',
  physik: '#5B8DEF',
  mathematik: '#9B6DFF',
  geschichte: '#C4924A',
  psychologie: '#E8719A',
  wirtschaft: '#4BBFBF',
  informatik: '#7EC8E3',
  sprachen: '#FFB347',
  medizin: '#FF6B6B',
  jura: '#8B9DC3',
  default: '#D4A843',
};

export function getSubjectColor(subject) {
  if (!subject) return SUBJECT_COLORS.default;
  const key = subject.toLowerCase().trim();
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.default;
}
