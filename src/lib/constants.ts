export const DENTAL_FILE_TYPES = [
  { id: "MODELO_DE_TRABALHO", label: "Modelo de Trabalho", description: "Modelo base anatômico para confecção protética" },
  { id: "ANTAGONISTA", label: "Antagonista", description: "Arco oponente para ajuste oclusal" },
  { id: "TROQUEL", label: "Troquel", description: "Segmento individualizado do dente preparado" },
  { id: "PLACA_MIORRELAXANTE", label: "Placa Miorrelaxante", description: "Dispositivo interoclusal para bruxismo e DTM" },
  { id: "ELEMENTO_PROVA", label: "Elemento para Prova", description: "Peça de prova estética e adaptação clínica" },
  { id: "ELEMENTO_PROVISORIO", label: "Elemento Provisório", description: "Restauração transitória imediata" },
  { id: "ELEMENTO_CARGA_CERAMICA", label: "Elemento Carga Cerâmica", description: "Infraestrutura reforçada para cobertura cerâmica" },
] as const;

export type DentalFileType = typeof DENTAL_FILE_TYPES[number]["id"];

export const FILE_TYPE_LABELS: Record<string, string> = {
  MODELO_DE_TRABALHO: "Modelo de Trabalho",
  ANTAGONISTA: "Antagonista",
  TROQUEL: "Troquel",
  PLACA_MIORRELAXANTE: "Placa Miorrelaxante",
  ELEMENTO_PROVA: "Elemento para Prova",
  ELEMENTO_PROVISORIO: "Elemento Provisório",
  ELEMENTO_CARGA_CERAMICA: "Elemento Carga Cerâmica",
};

export const PROCESS_TYPES = {
  FRESAGEM: "Fresagem",
  IMPRESSAO: "Impressão",
} as const;

export type ProcessType = keyof typeof PROCESS_TYPES;

export const USER_ROLES = {
  ADMIN: "Administrador",
  CADISTA: "Cadista",
  OPERADOR_RESINA: "Operador de Resinas",
  OPERADOR_IMPRESSAO: "Operador de Impressão",
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const ROLE_PERMISSIONS: Record<UserRole, { label: string; description: string; paths: string[] }> = {
  ADMIN: {
    label: "Administrador",
    description: "Acesso irrestrito a todos os módulos, configurações de sistema e auditoria.",
    paths: ["/dashboard", "/cadista/status", "/fila", "/fatiador", "/impressoes", "/resinas", "/calibracoes", "/impressoras", "/historico", "/admin/usuarios", "/admin/configuracoes"],
  },
  CADISTA: {
    label: "Cadista",
    description: "Criação de novos trabalhos, atualização de status de modelos e fila.",
    paths: ["/dashboard", "/cadista/status", "/fila", "/historico"],
  },
  OPERADOR_RESINA: {
    label: "Operador de Resinas",
    description: "Gestão do parque de impressoras, checklists de manutenção, recebimento de resina e calibrações.",
    paths: ["/dashboard", "/impressoras", "/resinas", "/calibracoes", "/historico"],
  },
  OPERADOR_IMPRESSAO: {
    label: "Operador de Impressão",
    description: "Gestão da fila de impressão, fatiamento, execução de impressões e controle de falhas/reimpressão.",
    paths: ["/dashboard", "/fila", "/fatiador", "/impressoes", "/historico"],
  },
};

export const PRINTER_STATUS = {
  DISPONIVEL: { label: "Disponível", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MANUTENCAO_VENCIDA: { label: "Manutenção Vencida", color: "bg-amber-50 text-amber-700 border-amber-200" },
  REPROVADA: { label: "Reprovada", color: "bg-rose-50 text-rose-700 border-rose-200" },
  INATIVA: { label: "Inativa", color: "bg-slate-50 text-slate-600 border-slate-200" },
} as const;

export const RESIN_STATUS = {
  AGUARDANDO_CALIBRACAO: { label: "Aguardando Calibração", color: "bg-amber-50 text-amber-700 border-amber-200" },
  CALIBRADA: { label: "Calibrada", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REPROVADA: { label: "Reprovada", color: "bg-rose-50 text-rose-700 border-rose-200" },
} as const;

export const DEFAULT_SYSTEM_SETTINGS = {
  maintenance_interval_days: 7,
  calibration_hexagon_min: 9.99,
  calibration_hexagon_max: 10.01,
  normal_print_prefix: "A",
  retry_print_prefix: "00A",
};
