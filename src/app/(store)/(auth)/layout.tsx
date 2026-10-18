export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80svh] max-w-md flex-col justify-center px-6 pb-24 pt-32">
      <div className="rounded-[2rem] bg-white p-8 shadow-soft sm:p-10">{children}</div>
    </div>
  );
}
