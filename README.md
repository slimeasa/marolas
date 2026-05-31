# 🌊 Marolas — Previsão de Ondas + Rede Social do Surf

Rede social do surf do **Litoral Norte de São Paulo** (Maresias, Paúba e Guaecá) com:

- **Previsão de ondas** direta e simples (altura, período, direção, vento, melhor janela do dia) — dados **reais** via [Open-Meteo](https://open-meteo.com), **sem chave de API**.
- **Tábua de marés** (maré alta/baixa por dia).
- **Login** como **Surfista** ou **Fotógrafo/Videomaker**.
- **Feed de fotos** com upload, curtidas e legendas.
- **Campeonatos** — criar, inscrever-se e gerenciar etapas.

Construído sem framework e sem etapa de build: só HTML, CSS e JavaScript (ES modules). Hospedagem **gratuita** e baixíssima manutenção.

---

## 🏗️ Arquitetura (tudo grátis)

| Função | Tecnologia | Custo |
|---|---|---|
| Previsão de ondas e marés | Open-Meteo Marine/Forecast API | Grátis, sem API key |
| Login, banco e upload de fotos | Supabase (free tier) | Grátis |
| Site (frontend) | HTML/CSS/JS estático | Grátis (Cloudflare Pages / Netlify / Vercel) |

### Por que é seguro 🔐
- A previsão **não usa nenhuma chave** → não há segredo para vazar.
- A única chave no frontend é a **anon key** do Supabase, que é **pública por design**.
- A proteção real dos dados está nas políticas **Row Level Security (RLS)** em [`supabase/schema.sql`](supabase/schema.sql): cada usuário só altera/apaga o que é dele, e fotos só podem ser enviadas para a pasta do próprio usuário.
- A `service_role key` (secreta) **nunca** é usada no frontend.

---

## ▶️ Rodar localmente

Como o app usa ES modules, abra-o por um servidor (não pelo `file://`). Você já tem Python:

```powershell
cd C:\Users\caiob\Documents\wavechecker
python -m http.server 5173
```

Abra <http://localhost:5173>. A **previsão de ondas e marés já funciona** sem configurar nada (modo demonstração).

---

## ⚙️ Configurar o Supabase (libera login, feed e campeonatos)

É gratuito e leva ~5 minutos.

1. Crie uma conta em <https://supabase.com> e clique em **New project**. Escolha uma senha de banco e a região mais próxima.
2. No menu lateral, abra **SQL Editor** → **New query**, cole **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas, as políticas de segurança (RLS) e o bucket de fotos.
3. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**
4. Abra [`js/config.js`](js/config.js) e cole os dois valores:
   ```js
   export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...sua-anon-key...';
   ```
5. (Opcional) Em **Authentication → Providers → Email**, desligue *"Confirm email"* para os usuários entrarem sem confirmar o e-mail durante os testes.
6. Recarregue o site. O banner de demonstração some e o login/feed/campeonatos ficam ativos. 🎉

---

## 🚀 Publicar na internet (grátis)

Qualquer hospedagem estática serve. Opção simples com **Cloudflare Pages** ou **Netlify**:

1. Suba esta pasta para um repositório no GitHub.
2. Em Cloudflare Pages/Netlify, conecte o repositório.
3. **Build command:** deixe vazio. **Output / publish directory:** a raiz (`/`).
4. Deploy. Pronto — site no ar de graça.

> Dica: no Supabase, em **Authentication → URL Configuration**, adicione o domínio publicado em *Site URL* / *Redirect URLs*.

---

## 📁 Estrutura

```
index.html              # shell do app
css/styles.css          # estilos (paleta do logo)
assets/logomarolas.png  # logo
js/
  app.js                # roteador + navegação + sessão
  config.js             # ⬅️ você preenche as chaves do Supabase aqui
  supabase.js           # cliente + auth
  ui.js                 # helpers de UI
  api/
    beaches.js          # praias (Maresias, Paúba, Guaecá)
    forecast.js         # Open-Meteo: ondas, vento, marés, nota da condição
  views/
    forecast.js         # previsão de ondas (desenho da onda + 7 dias)
    tides.js            # tábua de marés
    auth.js             # login / cadastro (surfista ou fotógrafo)
    feed.js             # feed + upload de fotos
    championships.js    # campeonatos
supabase/schema.sql     # tabelas + RLS + storage (rodar no Supabase)
```

---

## ❓ Sobre os dados da previsão

A previsão vem dos modelos meteorológicos do Open-Meteo (ECMWF/GFS/marine).

**Altura do surf na praia (não a do mar aberto).** O Open-Meteo informa a *altura significativa da ondulação em mar aberto* (offshore), que costuma ser bem maior que a onda que de fato quebra numa praia — principalmente em praias abrigadas como Guaecá. Por isso o app converte o valor offshore para a **altura do surf** usando, em [`js/api/beaches.js`](js/api/beaches.js):

- `exposure` — fator (0–1) de quão exposta é a praia, **calibrado contra o waves.com.br**: Maresias `0.95` (muito exposta, surf ≈ mar aberto), Paúba `0.66`, Guaecá `0.43` (enseada abrigada). É o que faz Guaecá mostrar ~0,7 m enquanto o mar aberto está em ~1,7 m.
- `optimalSwell` — direção (graus) de swell que entra melhor; quanto mais alinhada a ondulação, maior a onda.

A conversão fica em `surfHeight()` em [`js/api/forecast.js`](js/api/forecast.js). Se quiser deixar ainda mais fiel a uma referência (ex.: waves.com.br), basta ajustar o `exposure` de cada praia.

**Nomenclatura do surfe.** A altura também é mostrada em gíria (`surfSlang()`): Flat, Meio metrinho, Meio metro, Meio metrão, Um metro, Um metrão, Dois metros, e assim por diante.

**Nota da condição (0–10).** Combina o tamanho do surf, o período da ondulação e o vento (terral limpa a onda; vento forte estraga).

**Maré.** Derivada da curva de nível do mar do modelo (máximos = maré alta, mínimos = maré baixa).
