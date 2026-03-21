export interface CatalogItem {
  id: string;
  nome: string;
}

export const disciplinasStorageKey = 'school-compass:disciplinas';
export const periodosStorageKey = 'school-compass:periodos';

export const defaultDisciplinas: CatalogItem[] = [
  { id: 'mat', nome: 'Matematica' },
  { id: 'por', nome: 'Portugues' },
  { id: 'his', nome: 'Historia' },
  { id: 'geo', nome: 'Geografia' },
  { id: 'fis', nome: 'Fisica' },
  { id: 'qui', nome: 'Quimica' },
  { id: 'bio', nome: 'Biologia' },
  { id: 'ing', nome: 'Ingles' },
  { id: 'ed-fis', nome: 'Educacao Fisica' },
  { id: 'art', nome: 'Artes' },
];

export const defaultPeriodos: CatalogItem[] = [
  { id: '1b', nome: '1º Bimestre' },
  { id: '2b', nome: '2º Bimestre' },
  { id: '3b', nome: '3º Bimestre' },
  { id: '4b', nome: '4º Bimestre' },
  { id: 'sim', nome: 'Simulado' },
];

/** Com API ativa, `loadFromStorage` pode devolver [] se a chave ainda não existe no backend — mantém opções de bimestre nos formulários. */
export function periodosParaSelecao(loaded: CatalogItem[]): CatalogItem[] {
  return loaded.length > 0 ? loaded : defaultPeriodos;
}
