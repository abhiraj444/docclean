/**
 * High-fidelity realistic sample documents for instantaneous testing:
 * 1. Aged Yellowed Paper with Faint Pencil Text
 * 2. Smartphone Photo with Harsh Diagonal Shadow
 * 3. Inverted Blueprint / Dark Mode Schematic (Toner Inversion)
 * 4. Faded Invoice with Blue Signature & Red Official Notary Stamp
 */

export interface SampleDocMeta {
  id: string;
  name: string;
  label: string;
  description: string;
  generate: () => HTMLCanvasElement;
}

export function generateAgedYellowDocument(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d')!;

  // 1. Aged yellow paper background with subtle noise & texture
  ctx.fillStyle = '#eddba6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient aging from edges
  const grad = ctx.createRadialGradient(450, 625, 200, 450, 625, 650);
  grad.addColorStop(0, 'rgba(242, 226, 178, 0)');
  grad.addColorStop(1, 'rgba(196, 168, 114, 0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Paper fiber noise
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 16) {
    const grain = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + grain));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain));
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Faint pencil text & lines
  ctx.fillStyle = '#6e6353'; // Faded brown-gray pencil
  ctx.font = 'bold 28px "Times New Roman", serif';
  ctx.fillText('HISTORICAL ARCHIVE & DEED RECORD', 90, 110);

  ctx.strokeStyle = '#8c7d6b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, 130);
  ctx.lineTo(810, 130);
  ctx.stroke();

  ctx.font = '19px "Georgia", serif';
  ctx.fillStyle = '#7a6f5e';
  const lines = [
    'Section IV. Assessment of Historical Rights and Land Boundaries',
    'Recorded under Registry Volume 1884, folio number 392.',
    '',
    '1. The parcel identified under Parcel Reference #772-B shall remain subject to the',
    '   easements previously established under the covenant of 1862.',
    '2. Water rights along the eastern boundary drainage canal shall be maintained in common',
    '   proportion among all adjacent proprietors, free of encumbrance.',
    '3. Survey coordinates established by the Royal Surveyor specify a 42-degree offset',
    '   from the stone marker situated near the northern oak boundary.',
    '4. Any structural erection exceeding two stories requires formal conveyance',
    '   and unanimous written ratification by the board of trustees.',
    '',
    'Witnesseth under seal and signature of the presiding magistrate:',
  ];

  let y = 180;
  for (const line of lines) {
    ctx.fillText(line, 90, y);
    y += 34;
  }

  // Faint table
  y += 20;
  ctx.strokeRect(90, y, 720, 180);
  ctx.moveTo(90, y + 40);
  ctx.lineTo(810, y + 40);
  ctx.moveTo(330, y);
  ctx.lineTo(330, y + 180);
  ctx.moveTo(570, y);
  ctx.lineTo(570, y + 180);
  ctx.stroke();

  ctx.font = 'bold 16px "Georgia", serif';
  ctx.fillText('Parcel Identifier', 105, y + 26);
  ctx.fillText('Acreage Allocation', 345, y + 26);
  ctx.fillText('Conveyance Fee', 585, y + 26);

  ctx.font = '16px "Georgia", serif';
  ctx.fillText('North Quadrant 12', 105, y + 75);
  ctx.fillText('14.25 Acres (Woodland)', 345, y + 75);
  ctx.fillText('£ 42.10s.0d', 585, y + 75);

  ctx.fillText('South Quadrant 18', 105, y + 120);
  ctx.fillText('28.50 Acres (Arable)', 345, y + 120);
  ctx.fillText('£ 78.05s.6d', 585, y + 120);

  ctx.fillText('Eastern Mill Basin', 105, y + 165);
  ctx.fillText('06.10 Acres (Riparian)', 345, y + 165);
  ctx.fillText('£ 19.12s.0d', 585, y + 165);

  // Faint handwritten script
  ctx.font = 'italic 22px cursive';
  ctx.fillStyle = '#655a4b';
  ctx.fillText('J. Bartholomew Hastings, Registrar', 420, y + 260);

  return canvas;
}

export function generateShadowedPhonePhotoDocument(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d')!;

  // 1. Off-white table / sheet
  ctx.fillStyle = '#f4f3f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Clear corporate invoice content
  ctx.fillStyle = '#1c1f26';
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('TAX INVOICE / PURCHASE ORDER', 80, 100);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText('Invoice #: INV-2026-8819  |  Date: October 03, 2026  |  Due Date: Net 30', 80, 135);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 155);
  ctx.lineTo(820, 155);
  ctx.stroke();

  // Billed to
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#111827';
  ctx.fillText('BILLED TO:', 80, 195);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#374151';
  ctx.fillText('Vertex Global Logistics Ltd.', 80, 220);
  ctx.fillText('450 Innovation Parkway, Suite 800', 80, 242);
  ctx.fillText('San Francisco, CA 94105', 80, 264);

  // Table header
  ctx.fillStyle = '#e5e7eb';
  ctx.fillRect(80, 310, 740, 36);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('DESCRIPTION', 95, 333);
  ctx.fillText('HOURS / QTY', 420, 333);
  ctx.fillText('RATE', 560, 333);
  ctx.fillText('AMOUNT (USD)', 700, 333);

  // Rows
  const items = [
    { desc: 'Optical Sensor Calibration Suite v3.2', qty: '120 hrs', rate: '$145.00', amt: '$17,400.00' },
    { desc: 'Embedded Real-time Hardware Firmware Update', qty: '45 hrs', rate: '$180.00', amt: '$8,100.00' },
    { desc: 'Safety Compliance Audit & Stress Testing', qty: '1 unit', rate: '$4,500.00', amt: '$4,500.00' },
    { desc: 'Multi-Batch Image Processing Pipeline Verification', qty: '80 hrs', rate: '$160.00', amt: '$12,800.00' },
    { desc: 'Cloud Integration & Automated Export Gateway', qty: '35 hrs', rate: '$150.00', amt: '$5,250.00' },
  ];

  let ty = 375;
  for (const item of items) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#1f2937';
    ctx.fillText(item.desc, 95, ty);
    ctx.fillText(item.qty, 420, ty);
    ctx.fillText(item.rate, 560, ty);
    ctx.fillText(item.amt, 700, ty);

    ctx.strokeStyle = '#f3f4f6';
    ctx.beginPath();
    ctx.moveTo(80, ty + 12);
    ctx.lineTo(820, ty + 12);
    ctx.stroke();
    ty += 42;
  }

  // Totals
  ty += 20;
  ctx.font = '15px sans-serif';
  ctx.fillText('Subtotal:', 580, ty);
  ctx.fillText('$48,050.00', 710, ty);
  ty += 28;
  ctx.fillText('Estimated Tax (8.5%):', 580, ty);
  ctx.fillText('$4,084.25', 710, ty);
  ty += 32;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Total Due:', 580, ty);
  ctx.fillText('$52,134.25', 710, ty);

  // Bank instructions
  ty += 70;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Wire Remittance Instructions:', 80, ty);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText('Account Name: Precision Digital Systems LLC  |  Routing: 121000358  |  Account: 9482019482', 80, ty + 24);

  // 3. SEVERE REALISTIC PHONE SHADOW
  // Corner shadow from top-right down, and curved hand/phone shadow in bottom-right
  const shadowGrad = ctx.createLinearGradient(0, 0, 900, 1250);
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
  shadowGrad.addColorStop(0.35, 'rgba(0, 0, 0, 0.15)');
  shadowGrad.addColorStop(0.65, 'rgba(10, 15, 25, 0.45)'); // Heavy drop shadow!
  shadowGrad.addColorStop(1, 'rgba(5, 8, 15, 0.62)');
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Curved smartphone silhouette shadow in bottom quadrant
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(720, 1000, 260, 420, Math.PI / 5, 0, 2 * Math.PI);
  const phoneShadow = ctx.createRadialGradient(720, 1000, 50, 720, 1000, 320);
  phoneShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  phoneShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.40)');
  phoneShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = phoneShadow;
  ctx.fill();
  ctx.restore();

  return canvas;
}

export function generateDarkBlueprintDocument(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep navy dark mode / blueprint background
  ctx.fillStyle = '#0f1f38';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = '#183459';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // 2. White technical blueprint markings
  ctx.strokeStyle = '#e2ecf8';
  ctx.lineWidth = 2.5;

  // Mechanical schematic drawing
  ctx.strokeRect(180, 220, 540, 360);
  ctx.beginPath();
  ctx.arc(450, 400, 110, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(450, 400, 45, 0, 2 * Math.PI);
  ctx.stroke();

  // Dimension lines
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(180, 400);
  ctx.lineTo(720, 400);
  ctx.moveTo(450, 220);
  ctx.lineTo(450, 580);
  ctx.stroke();
  ctx.setLineDash([]);

  // Title Block
  ctx.fillStyle = '#e2ecf8';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('ENGINEERING SPECIFICATION: ROTOR ASSEMBLY', 90, 110);
  ctx.font = '16px monospace';
  ctx.fillText('CAD SCHEMATIC REF: DWG-88402-REV-D', 90, 140);
  ctx.fillText('SCALE: 1:25  |  MATERIAL: TITANIUM GRADE 5  |  UNITS: MM', 90, 168);

  ctx.fillText('TOLERANCE SPECIFICATIONS:', 90, 680);
  ctx.font = '14px monospace';
  const specs = [
    '• Outer Bore Diameter: 220.00 mm (± 0.02 mm)',
    '• Core Drive Hub: 90.00 mm (± 0.01 mm)',
    '• Flange Thickness: 18.50 mm (Uniform)',
    '• Dynamic Balancing: Class G 2.5 @ 12,000 RPM',
    '• Surface Finish: Ra 0.4 micrometers ground finish',
    '• Hydrostatic Pressure Test: 450 bar for 15 minutes',
  ];
  let sy = 715;
  for (const sp of specs) {
    ctx.fillText(sp, 110, sy);
    sy += 30;
  }

  // Warning box
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(90, 930, 720, 180);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('CRITICAL NOTICE FOR PRODUCTION LINE:', 110, 965);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#bfdbfe';
  ctx.fillText('Verify ultrasonic non-destructive flaw inspection prior to heat treatment.', 110, 995);
  ctx.fillText('Proprietary and Confidential. Unauthorized duplication prohibited.', 110, 1025);
  ctx.fillText('Approved By: Chief Systems Engineer  |  Signoff Stamp ID: ENG-992-QA', 110, 1055);

  return canvas;
}

export function generateLegalWithStampsDocument(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d')!;

  // 1. Slightly grayish scanned paper
  ctx.fillStyle = '#e8e8e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle scanner noise & edge dust
  const noiseGrad = ctx.createLinearGradient(0, 0, 900, 0);
  noiseGrad.addColorStop(0, 'rgba(0, 0, 0, 0.12)'); // Left shadow from scanner hinge
  noiseGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.02)');
  noiseGrad.addColorStop(0.92, 'rgba(0, 0, 0, 0.02)');
  noiseGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
  ctx.fillStyle = noiseGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Black legal text
  ctx.fillStyle = '#222';
  ctx.font = 'bold 26px "Times New Roman", serif';
  ctx.fillText('COMMERCIAL LEASE & INDEMNITY AGREEMENT', 80, 110);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 130);
  ctx.lineTo(820, 130);
  ctx.stroke();

  ctx.font = '16px "Times New Roman", serif';
  ctx.fillStyle = '#333';
  const clauses = [
    'THIS AGREEMENT entered into this 14th day of September, 2026, by and between',
    'Meridian Commercial Properties Corp. ("Lessor") and Helios Data Labs Inc. ("Lessee").',
    '',
    '1. PREMISES: Lessor hereby leases unto Lessee the commercial floor space situated at',
    '   Suite 400, Grand Central Plaza, comprising approximately 8,450 rentable square feet.',
    '2. TERM & COMMENCEMENT: The term shall be for five (5) full calendar years, commencing',
    '   on November 1, 2026 and expiring on October 31, 2031, unless earlier terminated.',
    '3. RENT & ESCALATION: Lessee covenants to pay an initial base monthly rental of',
    '   Twenty-Eight Thousand Four Hundred Dollars ($28,400.00), subject to an annual 3% index.',
    '4. PERMITTED USE: The premises shall be utilized strictly for general executive offices,',
    '   computational research, and auxiliary client consultation activities.',
    '5. INDEMNITY: Lessee agrees to defend, indemnify, and hold harmless Lessor against any',
    '   loss, damage, or claims arising from tenant modifications or premises occupancy.',
  ];

  let y = 175;
  for (const c of clauses) {
    ctx.fillText(c, 80, y);
    y += 32;
  }

  // 3. VIBRANT BLUE HANDWRITTEN PEN SIGNATURE
  ctx.font = 'italic bold 28px "Brush Script MT", cursive, sans-serif';
  ctx.fillStyle = '#1d4ed8'; // Vibrant blue ballpoint ink!
  ctx.fillText('Alexander Vance, CEO', 100, 780);
  ctx.fillText('Elena Rostova, Managing Partner', 460, 780);

  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(95, 790);
  ctx.bezierCurveTo(160, 770, 220, 810, 310, 785);
  ctx.bezierCurveTo(340, 770, 380, 790, 400, 775);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(455, 790);
  ctx.bezierCurveTo(520, 765, 590, 815, 680, 780);
  ctx.stroke();

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666';
  ctx.fillText('Authorized Signature for Lessee', 100, 815);
  ctx.fillText('Authorized Signature for Lessor', 460, 815);

  // 4. VIBRANT RED OFFICIAL NOTARY STAMP (Needs color preservation!)
  ctx.save();
  ctx.translate(680, 980);
  ctx.rotate(-0.08); // Slight organic tilt

  ctx.strokeStyle = '#dc2626'; // Notary Red Ink
  ctx.lineWidth = 3.5;
  ctx.strokeRect(-120, -60, 240, 120);

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  ctx.strokeRect(-114, -54, 228, 108);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('OFFICIAL NOTARY PUBLIC', 0, -25);
  ctx.font = '12px sans-serif';
  ctx.fillText('STATE OF CALIFORNIA', 0, -5);
  ctx.fillText('COMMISSION # 2409182', 0, 15);
  ctx.fillText('MY COMM. EXPIRES NOV 2028', 0, 35);
  ctx.restore();

  return canvas;
}

export const SAMPLE_DOCUMENTS: SampleDocMeta[] = [
  {
    id: 'yellow_aged',
    name: 'Yellowed Vintage Paper & Faint Ink',
    label: 'Aged Yellow Paper',
    description: 'Aged sepia paper with warm color cast and low-contrast faint pencil lines.',
    generate: generateAgedYellowDocument,
  },
  {
    id: 'phone_shadow',
    name: 'Smartphone Photo with Uneven Shadow',
    label: 'Phone Shadow / Gradient',
    description: 'Document captured under uneven ambient lighting with dark phone corner shadow.',
    generate: generateShadowedPhonePhotoDocument,
  },
  {
    id: 'blueprint_dark',
    name: 'Blueprint CAD Drawing (Inverted Dark Mode)',
    label: 'Inverted Blueprint (Toner Saver)',
    description: 'Navy blue technical drawing needing ink-saving inversion to clean white paper.',
    generate: generateDarkBlueprintDocument,
  },
  {
    id: 'stamped_legal',
    name: 'Agreement with Blue Pen & Red Notary Stamp',
    label: 'Preserve Color Stamps',
    description: 'Gray scanner background with blue signature and red seal requiring color preservation.',
    generate: generateLegalWithStampsDocument,
  },
];
