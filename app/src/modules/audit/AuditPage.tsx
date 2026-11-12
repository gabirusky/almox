import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '../shared/components/PageHeader';

interface AuditEvent {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: any;
  after_data: any;
  recorded_at: string;
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditLogs() {
      setLoading(true);
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar logs de auditoria:', error.message);
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    }

    fetchAuditLogs();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Auditoria do Sistema" 
        description="Histórico consolidado de ações sensíveis e alterações realizadas no almoxarifado."
      />

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-500">A carregar registos de auditoria...</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-center text-gray-500">Nenhum evento de auditoria registado até o momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b text-xs text-gray-700 uppercase">
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Entidade (Tabela)</th>
                  <th className="p-3">ID do Registo</th>
                  <th className="p-3">ID do Utilizador (Ator)</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(log.recorded_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-3 whitespace-nowrap font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">{log.entity_type}</td>
                    <td className="p-3 whitespace-nowrap text-gray-500 font-mono text-xs">{log.entity_id}</td>
                    <td className="p-3 whitespace-nowrap text-gray-500 font-mono text-xs">{log.actor_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}