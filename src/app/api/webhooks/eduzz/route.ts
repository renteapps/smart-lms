import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Valida se o payload tem a estrutura básica esperada da Eduzz
    if (!payload || !payload.event) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    // Lida especificamente com o evento de contrato criado
    if (payload.event === "myeduzz.contract_created") {
      const { data } = payload;
      
      const customer = data?.customer;
      const contract = data?.contract;
      const products = data?.products;

      console.log("=== Webhook Eduzz Recebido ===");
      console.log(`Evento: ${payload.event}`);
      console.log(`Cliente: ${customer?.name} (${customer?.email})`);
      console.log(`Contrato ID: ${contract?.id} - Status: ${contract?.status}`);
      console.log(`Produto(s): ${products?.map((p: any) => p.name).join(", ")}`);
      console.log("===============================");

      // TODO: Implementar lógica de salvar/atualizar no banco de dados
      // Ex: Buscar qual plano local corresponde ao Produto e/ou Produtor
      // const plano = await db.planos.findUnique({ 
      //   where: { gateway: 'Eduzz', productId: String(products[0]?.id), producerId: String(producer?.id) } 
      // })
      
      // Se não encontrar o plano, talvez criar ou apenas logar
      // Ex: Criar ou atualizar o usuário na tabela de users (usando customer.email)
      
      // Ex: Criar registro na tabela de subscriptions e vincular o plano e usuário
      // Logica de Expiração (nextDue):
      // - Se plano.frequency == "vitalicio", definir nextDue como null
      // - Se plano.frequency == "personalizado", calcular nextDue = data_hoje + plano.accessTimeDays
      // - Senão, assumir renovação natural da Eduzz

      return NextResponse.json({ success: true, message: "Webhook recebido e processado com sucesso" }, { status: 200 });
    }

    // Se recebermos outros eventos que não acompanhamos, retornamos 200 para a Eduzz não tentar reenviar
    console.log(`Webhook Eduzz ignorado. Evento: ${payload.event}`);
    return NextResponse.json({ success: true, message: "Evento ignorado" }, { status: 200 });
    
  } catch (error) {
    console.error("Erro ao processar webhook da Eduzz:", error);
    return NextResponse.json({ error: "Erro interno ao processar webhook" }, { status: 500 });
  }
}
