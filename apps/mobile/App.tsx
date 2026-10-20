import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from "react-native";
import {
  Currency, Invoice, InvoiceStatus, LineItem, createInvoice,
  duplicateInvoice, money, totals, uid, validate
} from "./src/invoice";
import { loadInvoices, removeInvoice, saveInvoice } from "./src/storage";
import { shareInvoicePdf } from "./src/pdf";

type Screen = "home" | "edit" | "preview";
type ButtonVariant = "primary" | "outline" | "subtle" | "danger";
const BG = "#f5f7fc";
const NAVY = "#172943";
const BLUE = "#335eea";
const MUTED = "#718098";
const BORDER = "#e3e9f2";

function ActionButton({ title, onPress, variant = "primary", disabled = false }:
  { title: string; onPress: () => void; variant?: ButtonVariant; disabled?: boolean }) {
  return <Pressable
    onPress={onPress} disabled={disabled}
    accessibilityRole="button" accessibilityLabel={title}
    style={({ pressed }) => [
      s.button,
      variant === "primary" ? s.primaryButton :
      variant === "danger" ? s.dangerButton :
      variant === "outline" ? s.outlineButton : s.subtleButton,
      (disabled || pressed) && { opacity: .55 }
    ]}
  >
    <Text style={[
      s.buttonText,
      variant === "primary" || variant === "danger" ? { color: "#fff" } : { color: NAVY }
    ]}>{title}</Text>
  </Pressable>;
}

function TextField({ label, value, onChangeText, placeholder, multiline = false, numeric = false }:
  { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; numeric?: boolean }) {
  return <View style={s.field}>
    <Text style={s.label}>{label}</Text>
    <TextInput
      style={[s.input, multiline && s.multiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor="#9ba6b6"
      multiline={multiline}
      keyboardType={numeric ? "decimal-pad" : "default"}
      autoCapitalize={numeric ? "none" : "sentences"}
      selectTextOnFocus={numeric}
      textAlignVertical={multiline ? "top" : "center"}
    />
  </View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={s.panel}>
    <Text style={s.sectionTitle}>{title}</Text>
    {children}
  </View>;
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const pillStyle = status === "Paid" ? s.paid : status === "Draft" ? s.draft : s.unpaid;
  const textStyle = status === "Paid" ? s.paidText : status === "Draft" ? s.draftText : s.unpaidText;
  return <View style={[s.pill, pillStyle]}><Text style={[s.pillText, textStyle]}>{status}</Text></View>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [current, setCurrent] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | InvoiceStatus>("All");

  useEffect(() => {
    loadInvoices().then(setInvoices).catch(error => {
      Alert.alert("Storage unavailable", String(error));
    }).finally(() => setLoading(false));
  }, []);

  function startNew() {
    setCurrent(createInvoice(invoices[0]));
    setScreen("edit");
  }
  function edit(invoice: Invoice) {
    setCurrent({ ...invoice, items: invoice.items.map(i => ({ ...i })) });
    setScreen("edit");
  }
  function patch<K extends keyof Invoice>(field: K, value: Invoice[K]) {
    setCurrent(prev => prev ? ({ ...prev, [field]: value }) : prev);
  }
  function patchItem(id: string, field: keyof LineItem, value: string) {
    setCurrent(prev => prev ? ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }) : prev);
  }
  function appendItem() {
    if (!current) return;
    patch("items", [...current.items, { id: uid(), description: "", quantity: "1", unitPrice: "0" }]);
  }
  function dropItem(id: string) {
    if (!current || current.items.length < 2) return;
    patch("items", current.items.filter(item => item.id !== id));
  }
  async function store(invoice: Invoice, nextScreen: Screen) {
    const message = validate(invoice);
    if (message) { Alert.alert("Check your invoice", message); return; }
    setBusy(true);
    try {
      const toStore = { ...invoice, updatedAt: new Date().toISOString() };
      await saveInvoice(toStore);
      setInvoices(prev => [toStore, ...prev.filter(i => i.id !== invoice.id)]);
      setCurrent(toStore);
      setScreen(nextScreen);
    } catch (error) {
      Alert.alert("Could not save", String(error));
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(status: InvoiceStatus) {
    if (!current) return;
    await store({ ...current, status }, "preview");
  }
  function confirmDelete() {
    if (!current) return;
    const id = current.id;
    Alert.alert("Delete invoice?", "This permanently deletes the local invoice. Export the PDF first if you need a copy.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await removeInvoice(id);
          setInvoices(prev => prev.filter(i => i.id !== id));
          setCurrent(null);
          setScreen("home");
        } catch (error) { Alert.alert("Delete failed", String(error)); }
      } }
    ]);
  }
  async function exportPdf() {
    if (!current) return;
    setBusy(true);
    try {
      await shareInvoicePdf(current);
    } catch (error) {
      Alert.alert("PDF error", String(error));
    } finally {
      setBusy(false);
    }
  }
  function cloneCurrent() {
    if (!current) return;
    setCurrent(duplicateInvoice(current));
    setScreen("edit");
  }

  const filtered = useMemo(() => invoices.filter(invoice =>
    (filter === "All" || invoice.status === filter) &&
    (invoice.number + " " + invoice.customerName + " " + invoice.businessName)
      .toLowerCase().includes(search.trim().toLowerCase())
  ), [filter, invoices, search]);

  const amountOutstanding = invoices.filter(i => i.status === "Unpaid").length;
  const paidCount = invoices.filter(i => i.status === "Paid").length;

  if (loading) return <SafeAreaView style={s.safe}><View style={s.loader}>
    <ActivityIndicator color={BLUE} size="large" />
    <Text style={s.muted}>Opening your invoices…</Text>
  </View></SafeAreaView>;

  return <SafeAreaView style={s.safe}>
    <StatusBar barStyle="dark-content" backgroundColor={BG} />
    <KeyboardAvoidingView
      style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {screen === "home" && <View style={s.flex}>
        <ScrollView style={s.flex} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <View style={s.topRow}>
            <View><Text style={s.brand}>▣  invoice maker</Text>
              <Text style={s.subtitle}>Your business, beautifully billed.</Text></View>
            <View style={s.avatar}><Text style={s.avatarText}>IM</Text></View>
          </View>
          <View style={s.hero}>
            <Text style={s.heroEyebrow}>YOUR INVOICE WORKSPACE</Text>
            <Text style={s.heroTitle}>Invoices made{"\n"}effortless.</Text>
            <Text style={s.heroCaption}>Create, save and share professional invoices in minutes.</Text>
            <Pressable style={s.heroButton} onPress={startNew} accessibilityRole="button">
              <Text style={s.heroButtonText}>＋  Create invoice</Text>
              <Text style={s.heroButtonText}>→</Text>
            </Pressable>
          </View>
          <View style={s.statsRow}>
            <View style={s.statCard}><Text style={s.statValue}>{invoices.length}</Text><Text style={s.statLabel}>Total invoices</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{amountOutstanding}</Text><Text style={s.statLabel}>Unpaid</Text></View>
            <View style={s.statCard}><Text style={s.statValue}>{paidCount}</Text><Text style={s.statLabel}>Paid</Text></View>
          </View>
          <View style={s.listHeader}><Text style={s.heading}>Your invoices</Text><Text style={s.muted}>{invoices.length} saved</Text></View>
          <TextInput
            style={s.search}
            placeholder="⌕  Search invoice or customer"
            value={search} onChangeText={setSearch}
            placeholderTextColor="#9ba6b6"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
            {(["All", "Draft", "Unpaid", "Paid"] as const).map(status =>
              <Pressable key={status} onPress={() => setFilter(status)}
                style={[s.filterChip, filter === status && s.filterActive]}
                accessibilityRole="button">
                <Text style={[s.filterText, filter === status && s.filterTextActive]}>{status}</Text>
              </Pressable>
            )}
          </ScrollView>
          {filtered.length === 0 ? <View style={s.empty}>
            <Text style={s.emptyIcon}>▤</Text>
            <Text style={s.emptyTitle}>{invoices.length ? "No matching invoices" : "No invoices yet"}</Text>
            <Text style={[s.muted, { textAlign: "center", lineHeight: 21 }]}>
              {invoices.length ? "Try a different search or status." : "Tap Create invoice to make your first one."}
            </Text>
          </View> : filtered.map(invoice =>
            <Pressable key={invoice.id} style={s.invoiceCard} onPress={() => {
              setCurrent(invoice); setScreen("preview");
            }} accessibilityRole="button">
              <View style={s.invoiceIcon}><Text style={s.invoiceIconText}>▤</Text></View>
              <View style={s.invoiceCardMain}>
                <Text style={s.invoiceNumber} numberOfLines={1}>{invoice.number}</Text>
                <Text style={s.invoiceCustomer} numberOfLines={1}>{invoice.customerName}</Text>
                <Text style={s.invoiceDate}>Issued {invoice.issuedOn}</Text>
              </View>
              <View style={s.invoiceRight}>
                <Text style={s.invoiceAmount}>{money(totals(invoice).total, invoice.currency)}</Text>
                <StatusPill status={invoice.status}/>
              </View>
            </Pressable>
          )}
          <Text style={s.offlineNote}>☁  Offline-first · Invoices saved on this device</Text>
        </ScrollView>
      </View>}

      {screen === "edit" && current && <View style={s.flex}>
        <View style={s.editorHeader}>
          <Pressable onPress={() => setScreen("home")} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
          <View style={s.flex}><Text style={s.screenTitle}>Invoice details</Text><Text style={s.small}>Create or edit your invoice</Text></View>
          <Pressable disabled={busy} onPress={() => store(current, "preview")} style={s.headerSave}>
            <Text style={s.headerSaveText}>{busy ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>
        <ScrollView style={s.flex} contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled">
          <Section title="Invoice information">
            <TextField label="Invoice number" value={current.number} onChangeText={v => patch("number", v)} />
            <View style={s.fieldRow}>
              <View style={s.flex}><TextField label="Issue date (YYYY-MM-DD)" value={current.issuedOn} onChangeText={v => patch("issuedOn", v)} /></View>
              <View style={s.flex}><TextField label="Due date (YYYY-MM-DD)" value={current.dueOn} onChangeText={v => patch("dueOn", v)} /></View>
            </View>
            <Text style={s.label}>Currency</Text>
            <View style={s.chipRow}>
              {(["INR", "USD", "GBP", "EUR"] as Currency[]).map(currency =>
                <Pressable key={currency} style={[s.currencyChip, current.currency === currency && s.currencyActive]}
                  onPress={() => patch("currency", currency)}>
                  <Text style={[s.currencyText, current.currency === currency && s.currencyTextActive]}>{currency}</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.label}>Status</Text>
            <View style={s.chipRow}>
              {(["Draft", "Unpaid", "Paid"] as InvoiceStatus[]).map(status =>
                <Pressable key={status} style={[s.currencyChip, current.status === status && s.currencyActive]}
                  onPress={() => patch("status", status)}>
                  <Text style={[s.currencyText, current.status === status && s.currencyTextActive]}>{status}</Text>
                </Pressable>
              )}
            </View>
          </Section>
          <Section title="From · Your business">
            <TextField label="Business name *" value={current.businessName} onChangeText={v => patch("businessName", v)} placeholder="My Business" />
            <TextField label="Email" value={current.businessEmail} onChangeText={v => patch("businessEmail", v)} />
            <TextField label="Address" value={current.businessAddress} onChangeText={v => patch("businessAddress", v)} multiline />
          </Section>
          <Section title="Bill to · Customer">
            <TextField label="Customer name *" value={current.customerName} onChangeText={v => patch("customerName", v)} placeholder="Customer / company" />
            <TextField label="Customer email" value={current.customerEmail} onChangeText={v => patch("customerEmail", v)} />
            <TextField label="Customer address" value={current.customerAddress} onChangeText={v => patch("customerAddress", v)} multiline />
          </Section>
          <Section title="Items & services">
            {current.items.map((item, index) => <View style={s.itemBlock} key={item.id}>
              <View style={s.itemHead}>
                <Text style={s.itemName}>Item {index + 1}</Text>
                {current.items.length > 1 && <Pressable onPress={() => dropItem(item.id)}>
                  <Text style={s.removeText}>Remove</Text>
                </Pressable>}
              </View>
              <TextField label="Description *" value={item.description}
                onChangeText={v => patchItem(item.id, "description", v)} placeholder="Product or service" />
              <View style={s.fieldRow}>
                <View style={s.flex}><TextField label="Quantity" value={item.quantity} numeric
                  onChangeText={v => patchItem(item.id, "quantity", v)} /></View>
                <View style={s.flex}><TextField label="Unit price" value={item.unitPrice} numeric
                  onChangeText={v => patchItem(item.id, "unitPrice", v)} /></View>
              </View>
              <View style={s.itemTotalRow}><Text style={s.small}>Line total</Text>
                <Text style={s.invoiceNumber}>{money(
                  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), current.currency
                )}</Text></View>
            </View>)}
            <ActionButton title="＋ Add item" variant="outline" onPress={appendItem}/>
          </Section>
          <Section title="Totals">
            <View style={s.fieldRow}>
              <View style={s.flex}><TextField label="Discount (fixed amount)" value={current.discount} numeric onChangeText={v => patch("discount", v)} /></View>
              <View style={s.flex}><TextField label="Tax (%)" value={current.taxRate} numeric onChangeText={v => patch("taxRate", v)} /></View>
            </View>
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{money(totals(current).subtotal, current.currency)}</Text></View>
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Discount</Text>
              <Text style={s.summaryValue}>− {money(totals(current).discount, current.currency)}</Text></View>
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Tax</Text>
              <Text style={s.summaryValue}>{money(totals(current).tax, current.currency)}</Text></View>
            <View style={s.totalLine}><Text style={s.totalLabel}>Total amount</Text>
              <Text style={s.totalValue}>{money(totals(current).total, current.currency)}</Text></View>
          </Section>
          <Section title="Notes">
            <TextField label="Payment instructions or message" value={current.notes}
              onChangeText={v => patch("notes", v)} multiline placeholder="Thank you for your business!" />
          </Section>
          <ActionButton disabled={busy} title={busy ? "Saving…" : "Save & preview invoice"} onPress={() => store(current, "preview")} />
          <Text style={s.offlineNote}>Invoices are saved locally to your phone.</Text>
        </ScrollView>
      </View>}

      {screen === "preview" && current && <View style={s.flex}>
        <View style={s.editorHeader}>
          <Pressable onPress={() => setScreen("home")} style={s.back}><Text style={s.backText}>‹</Text></Pressable>
          <View style={s.flex}><Text style={s.screenTitle}>Invoice preview</Text><Text style={s.small}>{current.number}</Text></View>
          <Pressable onPress={() => edit(current)} style={s.headerSave}><Text style={s.headerSaveText}>Edit</Text></Pressable>
        </View>
        <ScrollView style={s.flex} contentContainerStyle={s.formBody}>
          <View style={s.previewCard}>
            <View style={s.previewTop}>
              <Text style={s.previewTitle}>INVOICE</Text><StatusPill status={current.status}/>
            </View>
            <Text style={s.previewNumber}>#{current.number}</Text>
            <View style={s.previewDates}><Text style={s.previewMuted}>Issued: {current.issuedOn}</Text><Text style={s.previewMuted}>Due: {current.dueOn}</Text></View>
            <View style={s.separator} />
            <Text style={s.previewLabel}>FROM</Text><Text style={s.previewName}>{current.businessName}</Text>
            {!!current.businessEmail && <Text style={s.previewMuted}>{current.businessEmail}</Text>}
            {!!current.businessAddress && <Text style={s.previewMuted}>{current.businessAddress}</Text>}
            <View style={s.gap} />
            <Text style={s.previewLabel}>BILL TO</Text><Text style={s.previewName}>{current.customerName}</Text>
            {!!current.customerEmail && <Text style={s.previewMuted}>{current.customerEmail}</Text>}
            {!!current.customerAddress && <Text style={s.previewMuted}>{current.customerAddress}</Text>}
            <View style={s.separator} />
            {current.items.map(item => <View key={item.id} style={s.previewItem}>
              <View style={s.flex}><Text style={s.previewName}>{item.description}</Text>
                <Text style={s.previewMuted}>{item.quantity} × {money(Number(item.unitPrice), current.currency)}</Text></View>
              <Text style={s.previewName}>{money((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), current.currency)}</Text>
            </View>)}
            <View style={s.separator} />
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Subtotal</Text><Text style={s.summaryValue}>{money(totals(current).subtotal, current.currency)}</Text></View>
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Discount</Text><Text style={s.summaryValue}>− {money(totals(current).discount, current.currency)}</Text></View>
            <View style={s.summaryLine}><Text style={s.summaryLabel}>Tax ({current.taxRate}%)</Text><Text style={s.summaryValue}>{money(totals(current).tax, current.currency)}</Text></View>
            <View style={s.totalLine}><Text style={s.totalLabel}>TOTAL</Text><Text style={s.totalValue}>{money(totals(current).total, current.currency)}</Text></View>
            {!!current.notes.trim() && <View style={s.notes}><Text style={s.previewLabel}>NOTES</Text><Text style={s.previewMuted}>{current.notes}</Text></View>}
          </View>
          <ActionButton title={busy ? "Preparing…" : "↗  Share invoice PDF"} onPress={exportPdf} disabled={busy}/>
          <View style={s.twoButtons}>
            <View style={s.flex}><ActionButton title="Edit invoice" variant="outline" onPress={() => edit(current)} /></View>
            <View style={s.flex}><ActionButton title="Duplicate" variant="outline" onPress={cloneCurrent} /></View>
          </View>
          {current.status !== "Paid" && <ActionButton title="✓  Mark as paid" variant="subtle" disabled={busy} onPress={() => setStatus("Paid")} />}
          {current.status === "Paid" && <ActionButton title="Mark as unpaid" variant="subtle" disabled={busy} onPress={() => setStatus("Unpaid")} />}
          <ActionButton title="Delete invoice" variant="danger" onPress={confirmDelete}/>
        </ScrollView>
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0 },
  flex: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 38, paddingTop: 24 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  muted: { color: MUTED, fontSize: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 26 },
  brand: { color: NAVY, fontSize: 19, fontWeight: "900", letterSpacing: -.5 },
  subtitle: { color: MUTED, marginTop: 5, fontSize: 12 },
  avatar: { width: 41, height: 41, alignItems: "center", justifyContent: "center", backgroundColor: "#e1e9ff", borderRadius: 14 },
  avatarText: { color: BLUE, fontWeight: "800" },
  hero: { borderRadius: 25, backgroundColor: BLUE, padding: 25, overflow: "hidden" },
  heroEyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: "800", color: "#bed1ff" },
  heroTitle: { fontSize: 32, fontWeight: "900", letterSpacing: -1.2, lineHeight: 38, color: "#fff", marginTop: 15 },
  heroCaption: { fontSize: 13, lineHeight: 21, color: "#e3ebff", marginTop: 10, maxWidth: 280 },
  heroButton: { marginTop: 23, backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 13, flexDirection: "row", justifyContent: "space-between" },
  heroButtonText: { color: BLUE, fontWeight: "800", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  statCard: { backgroundColor: "#fff", flex: 1, paddingVertical: 17, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, borderColor: BORDER },
  statValue: { color: NAVY, fontSize: 22, fontWeight: "900" },
  statLabel: { color: MUTED, fontSize: 11, marginTop: 4 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 29, marginBottom: 15 },
  heading: { fontSize: 21, color: NAVY, fontWeight: "900" },
  search: { backgroundColor: "#fff", borderColor: BORDER, borderWidth: 1, borderRadius: 13, height: 51, paddingHorizontal: 16, color: NAVY, fontSize: 14 },
  filterScroll: { marginVertical: 17, flexGrow: 0 },
  filterChip: { borderRadius: 99, paddingHorizontal: 18, paddingVertical: 10, marginRight: 8, backgroundColor: "#fff", borderColor: BORDER, borderWidth: 1 },
  filterActive: { backgroundColor: NAVY, borderColor: NAVY },
  filterText: { color: MUTED, fontWeight: "700", fontSize: 12 },
  filterTextActive: { color: "#fff" },
  empty: { backgroundColor: "#fff", borderRadius: 20, alignItems: "center", paddingHorizontal: 35, paddingVertical: 40, borderColor: BORDER, borderWidth: 1 },
  emptyIcon: { fontSize: 40, color: "#9bb0ff" },
  emptyTitle: { fontSize: 18, fontWeight: "850", color: NAVY, marginTop: 12, marginBottom: 6 },
  invoiceCard: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", borderRadius: 17, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  invoiceIcon: { backgroundColor: "#eef2ff", width: 44, height: 44, borderRadius: 13, justifyContent: "center", alignItems: "center", marginRight: 11 },
  invoiceIconText: { color: BLUE, fontSize: 23 },
  invoiceCardMain: { flex: 1, minWidth: 0 },
  invoiceNumber: { color: NAVY, fontWeight: "800", fontSize: 13 },
  invoiceCustomer: { fontSize: 12, color: MUTED, marginTop: 3 },
  invoiceDate: { fontSize: 10, color: "#9ca8ba", marginTop: 5 },
  invoiceRight: { alignItems: "flex-end", gap: 7, marginLeft: 5 },
  invoiceAmount: { color: NAVY, fontWeight: "850", fontSize: 12 },
  pill: { borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10 },
  pillText: { fontSize: 10, fontWeight: "800" },
  paid: { backgroundColor: "#e0faeb" }, paidText: { color: "#0c8754" },
  draft: { backgroundColor: "#edf0f6" }, draftText: { color: "#66758a" },
  unpaid: { backgroundColor: "#fff0dd" }, unpaidText: { color: "#bc7510" },
  offlineNote: { textAlign: "center", color: "#91a0b6", fontSize: 11, marginTop: 22 },
  editorHeader: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderBottomWidth: 1, borderColor: BORDER },
  back: { backgroundColor: "#f0f3f9", height: 39, width: 39, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 30, color: NAVY, marginTop: -4 },
  screenTitle: { color: NAVY, fontSize: 17, fontWeight: "850" },
  small: { fontSize: 11, color: MUTED, marginTop: 3 },
  headerSave: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: "#e7edff", borderRadius: 11 },
  headerSaveText: { color: BLUE, fontWeight: "850" },
  formBody: { padding: 18, paddingBottom: 45, gap: 14 },
  panel: { backgroundColor: "#fff", borderWidth: 1, borderColor: BORDER, padding: 18, borderRadius: 18 },
  sectionTitle: { color: NAVY, fontSize: 16, fontWeight: "850", marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: "750", color: "#52627a", marginBottom: 7 },
  input: { backgroundColor: "#f8faff", borderWidth: 1, borderColor: "#e0e7f1", height: 46, borderRadius: 10, paddingHorizontal: 12, color: NAVY, fontSize: 13 },
  multiline: { height: 84, paddingTop: 12 },
  fieldRow: { flexDirection: "row", gap: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 15 },
  currencyChip: { paddingVertical: 10, paddingHorizontal: 13, borderColor: BORDER, borderWidth: 1, borderRadius: 10, backgroundColor: "#f8faff" },
  currencyActive: { backgroundColor: BLUE, borderColor: BLUE },
  currencyText: { color: NAVY, fontSize: 12, fontWeight: "700" },
  currencyTextActive: { color: "#fff" },
  itemBlock: { paddingBottom: 4, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: BORDER },
  itemHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  itemName: { color: BLUE, fontSize: 13, fontWeight: "800" },
  removeText: { color: "#dc4056", fontSize: 12, fontWeight: "750" },
  itemTotalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  button: { borderRadius: 12, paddingVertical: 15, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minHeight: 49 },
  primaryButton: { backgroundColor: BLUE },
  outlineButton: { backgroundColor: "#fff", borderColor: "#b8c8e9", borderWidth: 1 },
  subtleButton: { backgroundColor: "#dfe8ff" },
  dangerButton: { backgroundColor: "#dd475a" },
  buttonText: { fontSize: 14, fontWeight: "800" },
  summaryLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, gap: 12 },
  summaryLabel: { fontSize: 13, color: MUTED },
  summaryValue: { fontSize: 13, color: NAVY, fontWeight: "700" },
  totalLine: { marginTop: 10, borderTopWidth: 1, borderColor: BORDER, paddingTop: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  totalLabel: { color: NAVY, fontSize: 15, fontWeight: "850" },
  totalValue: { color: BLUE, fontSize: 22, fontWeight: "900" },
  previewCard: { backgroundColor: "#fff", padding: 22, borderRadius: 19, borderColor: BORDER, borderWidth: 1 },
  previewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewTitle: { color: BLUE, fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  previewNumber: { color: NAVY, fontWeight: "750", marginTop: 6, fontSize: 13 },
  previewDates: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, gap: 10 },
  previewMuted: { color: MUTED, fontSize: 12, lineHeight: 20 },
  previewLabel: { color: BLUE, fontSize: 10, fontWeight: "900", marginBottom: 9, letterSpacing: 1.2 },
  previewName: { color: NAVY, fontSize: 13, fontWeight: "800", lineHeight: 20 },
  separator: { height: 1, backgroundColor: BORDER, marginVertical: 21 },
  gap: { height: 22 },
  previewItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, gap: 10 },
  notes: { marginTop: 24, backgroundColor: "#f8faff", padding: 14, borderRadius: 10 },
  twoButtons: { flexDirection: "row", gap: 10 }
});
