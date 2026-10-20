import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Invoice, money, numberValue, totals } from "./invoice";

const htmlEscape = (value: string) => value.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
const lines = (value: string) => htmlEscape(value).replace(/\n/g, "<br />");

export function renderInvoiceHtml(invoice: Invoice) {
  const summary = totals(invoice);
  const rows = invoice.items.map(item => (
    "<tr><td>" + lines(item.description) + "</td><td class='num'>" +
    htmlEscape(item.quantity) + "</td><td class='num'>" +
    money(numberValue(item.unitPrice), invoice.currency) + "</td><td class='num'>" +
    money(numberValue(item.quantity) * numberValue(item.unitPrice), invoice.currency) +
    "</td></tr>"
  )).join("");
  return [
    "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'/>",
    "<style>body{font-family:Arial,sans-serif;color:#15243b;padding:28px;font-size:13px}",
    "h1{font-size:32px;margin:0;color:#1d4ed8}h2{font-size:14px;letter-spacing:.05em}",
    ".head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}",
    ".muted{color:#64748b;line-height:1.5}.columns{display:flex;justify-content:space-between;gap:28px;margin:28px 0}",
    ".columns>div{width:48%}table{width:100%;border-collapse:collapse;margin-top:24px}",
    "th{text-align:left;background:#edf3ff;color:#1e40af;padding:12px 8px}",
    "td{padding:12px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}.num{text-align:right}",
    ".sum{margin:22px 0 0 auto;width:260px}.sum div{display:flex;justify-content:space-between;margin-bottom:12px}",
    ".total{border-top:2px solid #1d4ed8;padding-top:14px;font-size:21px;font-weight:bold}",
    ".notes{margin-top:50px;border-top:1px solid #dbe4ee;padding-top:18px;white-space:normal}",
    "</style></head><body>",
    "<div class='head'><div><h1>INVOICE</h1><p class='muted'>#" + htmlEscape(invoice.number) +
      "<br/>Status: " + htmlEscape(invoice.status) + "</p></div>",
    "<div class='muted'>Issued: " + htmlEscape(invoice.issuedOn) + "<br/>Due: " +
      htmlEscape(invoice.dueOn) + "</div></div>",
    "<div class='columns'><div><h2>FROM</h2><b>" + lines(invoice.businessName) +
      "</b><p class='muted'>" + lines(invoice.businessAddress) + "<br/>" +
      lines(invoice.businessEmail) + "</p></div>",
    "<div><h2>BILL TO</h2><b>" + lines(invoice.customerName) + "</b><p class='muted'>" +
      lines(invoice.customerAddress) + "<br/>" + lines(invoice.customerEmail) + "</p></div></div>",
    "<table><thead><tr><th>DESCRIPTION</th><th class='num'>QTY</th><th class='num'>PRICE</th><th class='num'>AMOUNT</th></tr></thead>",
    "<tbody>" + rows + "</tbody></table>",
    "<div class='sum'><div><span>Subtotal</span><span>" + money(summary.subtotal, invoice.currency) +
      "</span></div><div><span>Discount</span><span>-" + money(summary.discount, invoice.currency) +
      "</span></div><div><span>Tax (" + htmlEscape(invoice.taxRate) +
      "%)</span><span>" + money(summary.tax, invoice.currency) +
      "</span></div><div class='total'><span>Total</span><span>" +
      money(summary.total, invoice.currency) + "</span></div></div>",
    invoice.notes.trim() ? "<div class='notes'><h2>NOTES</h2><p>" + lines(invoice.notes) + "</p></div>" : "",
    "</body></html>"
  ].join("");
}

export async function shareInvoicePdf(invoice: Invoice) {
  const result = await Print.printToFileAsync({ html: renderInvoiceHtml(invoice) });
  if (!await Sharing.isAvailableAsync()) {
    throw new Error("Sharing is unavailable on this device.");
  }
  await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
