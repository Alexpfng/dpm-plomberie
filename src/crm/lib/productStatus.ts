export const PRODUCT_STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect", color: "bg-blue-500 text-white" },
  { value: "rdv_booke", label: "RDV Booké", color: "bg-yellow-500 text-white" },
  { value: "demo_faite", label: "Démo faite", color: "bg-orange-500 text-white" },
  { value: "compte_cree", label: "Compte créé", color: "bg-emerald-400 text-white" },
  { value: "compte_active", label: "Compte activé", color: "bg-emerald-500 text-white" },
  { value: "user_actif", label: "User actif", color: "bg-green-600 text-white" },
  { value: "user_inactif", label: "User inactif", color: "bg-gray-400 text-white" },
  { value: "client_payant", label: "Client payant", color: "bg-purple-500 text-white" },
  { value: "client_churn", label: "Client churn", color: "bg-red-500 text-white" },
  { value: "refus_definitif", label: "Refus définitif", color: "bg-gray-600 text-white" },
];

export function getProductStatusBadge(status: string) {
  return PRODUCT_STATUS_OPTIONS.find((s) => s.value === status) || PRODUCT_STATUS_OPTIONS[0];
}
