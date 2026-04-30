export function ThankYou({ poste_titre }: { poste_titre: string }) {
  return (
    <div className="max-w-md mx-auto p-12 text-center space-y-4">
      <h1 className="text-2xl font-serif">Merci pour ta candidature !</h1>
      <p className="text-text-secondary">
        Nous avons bien reçu ta candidature pour le poste{" "}
        <strong>{poste_titre}</strong>.
      </p>
      <p className="text-sm text-text-muted">
        Tu recevras un email d&apos;ici quelques jours avec la suite du process.
        En attendant, vérifie tes spams.
      </p>
    </div>
  );
}
