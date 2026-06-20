import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <Layout>
      <Dashboard />
      <Toaster position="bottom-right" />
    </Layout>
  );
}
