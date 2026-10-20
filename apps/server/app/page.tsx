export const dynamic = "force-dynamic";

const appStore = process.env.APP_STORE_URL;
const playStore = process.env.PLAY_STORE_URL;
const apkDownload = process.env.APK_DOWNLOAD_URL?.trim() || "https://github.com/gergeant5-sketch/Mobileapp/releases/download/preview-latest/Invoice-Maker.apk";

export default function HomePage() {
  return (
    <main className="site">
      <div className="shine" aria-hidden="true" />
      <header className="header">
        <a className="logo" href="/" aria-label="Invoice Maker home"><span className="mark">▣</span> Invoice Maker</a>
        <span className="pill">Made for busy businesses</span>
      </header>
      <section className="hero">
        <span className="eyebrow">INVOICES. MADE SIMPLE.</span>
        <h1>Professional invoices.<br /><em>Right from your phone.</em></h1>
        <p className="lede">Create an invoice in minutes, calculate totals automatically, and share a polished PDF. Works offline on iPhone and Android.</p>
        <div className="actions">
          {appStore ? <a className="primary" href={appStore} rel="noopener noreferrer">Download for iPhone <span>↗</span></a> : <span className="disabled">iPhone — Coming soon</span>}
          {playStore ? <a className="secondary" href={playStore} rel="noopener noreferrer">Get it on Google Play <span>↗</span></a> : null}
          {apkDownload && <a className="secondary" href={apkDownload} rel="noopener noreferrer">Download Android Test APK <span>↗</span></a>}
        </div>
        <div className="features">
          <div><strong>01</strong><span>Create and edit invoices</span></div>
          <div><strong>02</strong><span>Instant tax and totals</span></div>
          <div><strong>03</strong><span>Share professional PDFs</span></div>
        </div>
      </section>
      <section className="preview" aria-label="Example invoice">
        <div className="previewTop"><span>YOUR INVOICE</span><span className="paid">READY TO SEND</span></div>
        <div className="invoiceLarge">Invoice <span>#001</span></div>
        <div className="previewSub">Easy to create. Easy to share.</div>
        <div className="line" />
        <div className="invoiceRow"><span>Website design</span><strong>₹ 12,000.00</strong></div>
        <div className="invoiceRow"><span>Logo design</span><strong>₹ 3,000.00</strong></div>
        <div className="line" />
        <div className="invoiceRow total"><span>Total</span><strong>₹ 15,000.00</strong></div>
      </section>
      <footer>© {new Date().getFullYear()} Invoice Maker · Built for iOS and Android</footer>
    </main>
  );
}
