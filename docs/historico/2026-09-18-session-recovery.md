# Dashboard sem sessão em aba restaurada — 18/09/2026

## Evidências

- Autostart concluiu às 08:27:16 BRT; um único processo Node do tracker estava ativo.
- Postgres no Docker estava saudável; `/health` retornou HTTP 200 com `db.status=ok`.
- No Chrome, `/api/auth/me` e `/api/dashboard/summary?period=month` retornaram 401. O corpo de `/auth/me` foi `No token provided`.
- A aba restaurada ainda mostrava a identidade do usuário. Recarregar levou a `/login`.
- As funções reais de resumo/gráficos retornaram os dados do mês e do histórico completo em uma consulta somente leitura ao banco.

## Causa

`api.ts` lançava `ApiError(401)`, mas não invalidava o usuário mantido no `AuthContext`. O guard do layout dependia desse estado e continuava permitindo o dashboard, que tratava a falha como erro genérico. A causa da ausência do cookie não foi determinada; a validade padrão do cookie é sete dias.

Somente o banco está no Docker. O watchdog do Windows verifica `/health` e inicia o servidor Node. Esse monitor estava funcionando e não gerencia a sessão do navegador.

## Correção

O frontend invalida a sessão em respostas 401 protegidas, limpa os caches de dados/CSRF e apresenta o login. Falhas de credenciais no login permanecem locais ao formulário; respostas de uma sessão anterior não podem invalidar um login novo. A consulta de onboarding aguarda a confirmação do usuário autenticado.

Nenhuma credencial, prazo de sessão, configuração Docker ou dado do banco foi alterado.
