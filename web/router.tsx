import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
const legacyPath = (value: any): string => {
  if (typeof value === 'string') {
    if (value === '/(tabs)' || value === '/(tabs)/') return '/therapist/clients';
    if (value === '/(parent)' || value === '/(parent)/') return '/parent/progress';
    if (value === '/(clinic)' || value === '/(clinic)/') return '/clinic/overview';
    return value;
  }
  if (value && typeof value === 'object') {
    const params = value.params ?? {};
    const path = String(value.pathname ?? '/');
    return Object.entries(params).reduce((result, [key, val]) => result.replace(`[${key}]`, encodeURIComponent(String(val))), path);
  }
  return '/';
};
export function useRouter() {
  const navigate = useNavigate();
  return { push: (to: any) => navigate(legacyPath(to)), replace: (to: any) => navigate(legacyPath(to), { replace: true }), back: () => navigate(-1), canGoBack: () => window.history.length > 1 };
}
export function useLocalSearchParams<T extends Record<string, any> = Record<string, string>>() {
  const params = useParams();
  const [query] = useSearchParams();
  const result: Record<string, any> = { ...params };
  query.forEach((value, key) => { result[key] = value; });
  return result as T;
}
export { useLocation, useNavigate };
