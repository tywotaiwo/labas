'use client';

export function PrintButton() {
  return (
    <button className="primary no-print" type="button" onClick={() => window.print()} style={{ marginTop: 12 }}>
      Save as PDF
    </button>
  );
}
