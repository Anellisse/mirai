import { LoginForm } from './_components/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-500">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-900">Mirai</h1>
          <p className="text-gray-500 text-sm mt-1">Centro Neuropsia</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
