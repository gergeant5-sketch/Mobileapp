export type InvoiceStatus = "Draft" | "Unpaid" | "Paid";
export type Currency = "INR" | "USD" | "GBP" | "EUR";

export type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type Invoice = {
  id: string;
  number: string;
  createdAt: string;
  updatedAt: string;
  issuedOn: string;
  dueOn: string;
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  items: LineItem[];
  currency: Currency;
  discount: string;
  taxRate: string;
  notes: string;
  status: InvoiceStatus;
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
const isoToday = () => new Date().toISOString().slice(0, 10);

export function createInvoice(previous?: Invoice): Invoice {
  const now = new Date().toISOString();
  return {
    id: uid(),
    number: "INV-" + new Date().getFullYear() + "-" + Math.floor(Date.now() / 1000).toString().slice(-6),
    createdAt: now,
    updatedAt: now,
    issuedOn: isoToday(),
    dueOn: isoToday(),
    businessName: previous?.businessName ?? "",
    businessEmail: previous?.businessEmail ?? "",
    businessAddress: previous?.businessAddress ?? "",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    items: [{ id: uid(), description: "", quantity: "1", unitPrice: "0" }],
    currency: previous?.currency ?? "INR",
    discount: "0",
    taxRate: "0",
    notes: "",
    status: "Draft"
  };
}

export function duplicateInvoice(invoice: Invoice): Invoice {
  const fresh = createInvoice(invoice);
  return {
    ...invoice,
    id: fresh.id,
    number: fresh.number,
    createdAt: fresh.createdAt,
    updatedAt: fresh.updatedAt,
    issuedOn: fresh.issuedOn,
    dueOn: fresh.dueOn,
    items: invoice.items.map(item => ({ ...item, id: uid() })),
    status: "Draft"
  };
}

export const numberValue = (input: string) => {
  const num = Number(input);
  return Number.isFinite(num) && num > 0 ? num : 0;
};
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function totals(invoice: Invoice) {
  const subtotal = round(invoice.items.reduce((sum, item) => sum +
    numberValue(item.quantity) * numberValue(item.unitPrice), 0));
  const discount = Math.min(subtotal, round(numberValue(invoice.discount)));
  const taxable = Math.max(0, subtotal - discount);
  const tax = round(taxable * Math.min(100, numberValue(invoice.taxRate)) / 100);
  return { subtotal, discount, tax, total: round(taxable + tax) };
}

export function money(value: number, currency: Currency) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function validate(invoice: Invoice): string | null {
  if (!invoice.number.trim()) return "Enter an invoice number.";
  if (!invoice.businessName.trim()) return "Enter your business name.";
  if (!invoice.customerName.trim()) return "Enter a customer name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.issuedOn) ||
      !Number.isFinite(Date.parse(invoice.issuedOn))) return "Enter an issue date as YYYY-MM-DD.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueOn) ||
      !Number.isFinite(Date.parse(invoice.dueOn))) return "Enter a due date as YYYY-MM-DD.";
  if (!invoice.items.length) return "Add at least one item.";
  if (invoice.items.some(i => !i.description.trim() ||
      !Number.isFinite(Number(i.quantity)) || Number(i.quantity) <= 0 ||
      !Number.isFinite(Number(i.unitPrice)) || Number(i.unitPrice) < 0)) {
    return "Each item needs a description, a quantity greater than zero, and a valid nonnegative price.";
  }
  if (!Number.isFinite(Number(invoice.discount)) || Number(invoice.discount) < 0) return "Discount must be zero or greater.";
  if (!Number.isFinite(Number(invoice.taxRate)) || Number(invoice.taxRate) < 0 || Number(invoice.taxRate) > 100) return "Tax rate must be from 0 to 100.";
  if (numberValue(invoice.discount) > totals(invoice).subtotal) return "Discount cannot exceed subtotal.";
  return null;
}
