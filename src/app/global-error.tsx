"use client";

/** Último recurso: erro no layout raiz. Precisa renderizar <html> e <body> próprios, sem depender de CSS global. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F1E8", color: "#3E2723" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, margin: 0 }}>Maison du Pain</h1>
            <p style={{ margin: "12px 0 20px" }}>Tivemos um problema inesperado. Tente novamente.</p>
            <button
              onClick={reset}
              style={{ background: "#3E2723", color: "#F7F1E8", border: 0, borderRadius: 999, padding: "12px 24px", cursor: "pointer" }}
            >
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
