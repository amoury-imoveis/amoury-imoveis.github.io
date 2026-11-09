# Como adicionar e editar imóveis (de graça, pelo celular ou PC)

O site lê os imóveis do arquivo `data/imoveis.json`. Para editar sem mexer em código, use o **Pages CMS**:

1. Acesse **https://app.pagescms.org** e clique em **Sign in with GitHub**.
2. Autorize o acesso ao repositório do site.
3. Abra **Imóveis**. Cada item da lista é um anúncio:
   - **Adicionar:** botão "Add an entry", preencha os campos e envie as fotos (a primeira é a capa).
   - **Vendido/Alugado:** mude o campo **Situação**. O card fica em preto e branco com a faixa "VENDIDO"/"ALUGADO".
   - **Reservado:** mostra uma faixa dourada "RESERVADO".
   - **Destaque:** marca para aparecer primeiro.
4. Clique em **Save**. Em cerca de 1 minuto o site é atualizado.

Dicas:
- Fotos na horizontal, até ~1 MB cada.
- O link de cada imóvel pode ser compartilhado (botão "Compartilhar" dentro do anúncio).
- Apague os anúncios de exemplo (códigos EX-01 a EX-06) antes de divulgar o site.
- Contatos e CRECI do responsável ficam em `assets/js/config.js`.
