// Datos del demo "Company Data Agent": una tienda ficticia de celulares
// reacondicionados (Volt Mobile). Los documentos alimentan el RAG (pgvector) y
// las tablas alimentan las tools SQL. Todo vive en el schema `agent_demo`,
// separado del resto de la base.

export type DemoDoc = { slug: string; title: string; sections: { heading: string; body: string }[] }

export const docs: DemoDoc[] = [
  {
    slug: 'shipping',
    title: 'Shipping Policy',
    sections: [
      {
        heading: 'Delivery times',
        body: 'Orders paid before 2:00 pm (Mexico City time) ship the same business day. Standard shipping takes 2–4 business days nationwide. Express shipping takes 1–2 business days and is only available in CDMX, Guadalajara and Monterrey.',
      },
      {
        heading: 'Costs',
        body: 'Standard shipping is free on orders over $3,000 MXN; otherwise it costs $149 MXN. Express shipping costs $299 MXN regardless of order total.',
      },
      {
        heading: 'Carriers and tracking',
        body: 'We ship with Estafeta and DHL. A tracking number is emailed when the order leaves the warehouse. Tracking can take up to 12 hours to show the first scan.',
      },
    ],
  },
  {
    slug: 'returns',
    title: 'Returns & Refunds',
    sections: [
      {
        heading: 'Return window',
        body: 'Customers can return any device within 30 days of delivery for a full refund, as long as it is not physically damaged and iCloud / Google account locks have been removed.',
      },
      {
        heading: 'How refunds are paid',
        body: 'Refunds go back to the original payment method within 5–10 business days after the warehouse inspects the device. Shipping costs are not refunded unless the device was defective.',
      },
      {
        heading: 'Exceptions',
        body: 'Accessories opened from their sealed packaging cannot be returned. Devices bought in a clearance sale can be returned within 7 days only.',
      },
    ],
  },
  {
    slug: 'warranty',
    title: 'Warranty',
    sections: [
      {
        heading: 'Coverage',
        body: 'Every device includes a 12-month Volt warranty covering hardware failures not caused by the customer: battery below 80% health, faulty buttons, speakers, cameras, Face ID / Touch ID and charging port.',
      },
      {
        heading: 'Not covered',
        body: 'The warranty does not cover water damage, cracked screens or back glass, devices opened by third-party repair shops, or software issues caused by jailbreaking.',
      },
      {
        heading: 'Claim process',
        body: 'To start a claim, the customer replies to their order email with the order number and a short video of the issue. We send a prepaid label; repairs or replacements take 5–7 business days.',
      },
    ],
  },
  {
    slug: 'grading',
    title: 'Device Condition Grades',
    sections: [
      {
        heading: 'Grade A',
        body: 'Grade A devices look like new: no visible scratches at arm’s length, battery health of at least 88%.',
      },
      {
        heading: 'Grade B',
        body: 'Grade B devices have light scratches on the frame or back, screen is flawless, battery health of at least 85%.',
      },
      {
        heading: 'Grade C',
        body: 'Grade C devices have visible wear, possible small marks on the screen that are not visible when it is on, battery health of at least 80%. All grades are fully functional and include the same 12-month warranty.',
      },
    ],
  },
  {
    slug: 'payments',
    title: 'Payments & Installments',
    sections: [
      {
        heading: 'Accepted methods',
        body: 'We accept credit and debit cards, OXXO cash payments, SPEI bank transfers and Mercado Pago. OXXO and SPEI orders ship once the payment is confirmed, usually within 1 hour for SPEI and up to 24 hours for OXXO.',
      },
      {
        heading: 'Interest-free installments',
        body: 'Purchases over $4,000 MXN can be paid in 3, 6 or 9 interest-free monthly installments (MSI) with participating bank credit cards. 12 MSI is available only during promotions.',
      },
    ],
  },
  {
    slug: 'trade-in',
    title: 'Trade-in Program',
    sections: [
      {
        heading: 'How it works',
        body: 'Customers can trade in an iPhone 11 or newer toward a purchase. We give an instant quote online; the final value is confirmed after inspection and applied as store credit or bank transfer.',
      },
      {
        heading: 'Requirements',
        body: 'Trade-in devices must power on, be unlocked from iCloud, and not be reported lost or stolen. Devices with cracked screens are accepted at a reduced value.',
      },
    ],
  },
]

export type DemoProduct = {
  sku: string
  model: string
  storage_gb: number
  grade: 'A' | 'B' | 'C'
  color: string
  price_mxn: number
  stock: number
  battery_health: number
}

export const products: DemoProduct[] = [
  { sku: 'IP13-128-A-MID', model: 'iPhone 13', storage_gb: 128, grade: 'A', color: 'Midnight', price_mxn: 8499, stock: 7, battery_health: 91 },
  { sku: 'IP13-128-B-BLU', model: 'iPhone 13', storage_gb: 128, grade: 'B', color: 'Blue', price_mxn: 7699, stock: 3, battery_health: 87 },
  { sku: 'IP13-256-C-STA', model: 'iPhone 13', storage_gb: 256, grade: 'C', color: 'Starlight', price_mxn: 7199, stock: 2, battery_health: 82 },
  { sku: 'IP14-128-A-PUR', model: 'iPhone 14', storage_gb: 128, grade: 'A', color: 'Purple', price_mxn: 10299, stock: 5, battery_health: 93 },
  { sku: 'IP14-256-B-MID', model: 'iPhone 14', storage_gb: 256, grade: 'B', color: 'Midnight', price_mxn: 10899, stock: 0, battery_health: 86 },
  { sku: 'IP14P-128-A-GLD', model: 'iPhone 14 Pro', storage_gb: 128, grade: 'A', color: 'Gold', price_mxn: 13999, stock: 4, battery_health: 90 },
  { sku: 'IP14P-256-B-BLK', model: 'iPhone 14 Pro', storage_gb: 256, grade: 'B', color: 'Space Black', price_mxn: 13499, stock: 6, battery_health: 86 },
  { sku: 'IP15-128-A-BLK', model: 'iPhone 15', storage_gb: 128, grade: 'A', color: 'Black', price_mxn: 12999, stock: 9, battery_health: 97 },
  { sku: 'IP15-256-A-PNK', model: 'iPhone 15', storage_gb: 256, grade: 'A', color: 'Pink', price_mxn: 14299, stock: 2, battery_health: 96 },
  { sku: 'IP15P-256-A-NAT', model: 'iPhone 15 Pro', storage_gb: 256, grade: 'A', color: 'Natural Titanium', price_mxn: 18999, stock: 3, battery_health: 95 },
  { sku: 'IP15PM-256-B-BLU', model: 'iPhone 15 Pro Max', storage_gb: 256, grade: 'B', color: 'Blue Titanium', price_mxn: 20499, stock: 1, battery_health: 89 },
  { sku: 'IP16-128-A-ULT', model: 'iPhone 16', storage_gb: 128, grade: 'A', color: 'Ultramarine', price_mxn: 15999, stock: 4, battery_health: 100 },
]

export type DemoOrder = {
  id: string
  customer_email: string
  sku: string
  status: 'pending_payment' | 'processing' | 'shipped' | 'delivered' | 'returned'
  total_mxn: number
  created_at: string
  shipped_at: string | null
  carrier: string | null
  tracking: string | null
}

export const orders: DemoOrder[] = [
  { id: 'VM-1001', customer_email: 'ana@example.com', sku: 'IP13-128-A-MID', status: 'delivered', total_mxn: 8499, created_at: '2026-10-02', shipped_at: '2026-10-02', carrier: 'Estafeta', tracking: 'EST4471920031' },
  { id: 'VM-1002', customer_email: 'luis@example.com', sku: 'IP15-128-A-BLK', status: 'shipped', total_mxn: 12999, created_at: '2026-10-24', shipped_at: '2026-10-25', carrier: 'DHL', tracking: 'DHL8820145567' },
  { id: 'VM-1003', customer_email: 'sofia@example.com', sku: 'IP14P-256-B-BLK', status: 'processing', total_mxn: 13499, created_at: '2026-10-26', shipped_at: null, carrier: null, tracking: null },
  { id: 'VM-1004', customer_email: 'diego@example.com', sku: 'IP13-256-C-STA', status: 'pending_payment', total_mxn: 7348, created_at: '2026-10-26', shipped_at: null, carrier: null, tracking: null },
  { id: 'VM-1005', customer_email: 'carla@example.com', sku: 'IP14-128-A-PUR', status: 'returned', total_mxn: 10299, created_at: '2026-09-12', shipped_at: '2026-09-12', carrier: 'Estafeta', tracking: 'EST4471007788' },
  { id: 'VM-1006', customer_email: 'ana@example.com', sku: 'IP16-128-A-ULT', status: 'shipped', total_mxn: 15999, created_at: '2026-10-25', shipped_at: '2026-10-26', carrier: 'Estafeta', tracking: 'EST4472301145' },
  { id: 'VM-1007', customer_email: 'mario@example.com', sku: 'IP15P-256-A-NAT', status: 'delivered', total_mxn: 18999, created_at: '2026-10-10', shipped_at: '2026-10-11', carrier: 'DHL', tracking: 'DHL8820099120' },
  { id: 'VM-1008', customer_email: 'paula@example.com', sku: 'IP13-128-B-BLU', status: 'delivered', total_mxn: 7848, created_at: '2026-10-15', shipped_at: '2026-10-15', carrier: 'Estafeta', tracking: 'EST4471811190' },
]

// Preguntas sugeridas en la UI: cada una ejercita una ruta distinta del agente.
export const suggestedQuestions = [
  'Where is order VM-1002? My email is luis@example.com',
  'Which iPhone 15 models do you have in stock under $15,000 MXN?',
  'Can I return a phone I bought 3 weeks ago? How long does the refund take?',
  'Does the warranty cover a cracked screen?',
  'Can I pay an iPhone 14 Pro in installments?',
]
