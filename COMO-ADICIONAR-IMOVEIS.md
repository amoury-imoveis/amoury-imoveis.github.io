# Como cadastrar imóveis no site

## Painel próprio (recomendado)

Endereço: **https://amoury-imoveis.github.io/admin/**

1. Abra o **link de acesso** recebido no WhatsApp. Ele já entra direto e fica salvo no aparelho.
2. Toque em **Cadastrar imóvel** e siga os 5 passos: fotos, o básico, valores, características e descrição.
3. Toque em **Salvar e publicar**. Em cerca de 1 minuto aparece no site.

- **Vendeu ou alugou?** Toque na situação do imóvel (ex.: "Disponível") e escolha **Vendido** ou **Alugado**.
- **Editar:** botão do lápis. **Excluir:** botão da lixeira (apaga as fotos também).
- As fotos são reduzidas automaticamente no celular antes de enviar.

### Chave de acesso (para o administrador)

O painel usa um token *fine-grained* do GitHub com acesso **somente** ao repositório
`amoury-imoveis/amoury-imoveis.github.io` e permissão **Contents: Read and write**.
O link de acesso é: `https://amoury-imoveis.github.io/admin/#chave=SEU_TOKEN`.
Se o celular for perdido, revogue o token em GitHub → Settings → Developer settings → Personal access tokens e gere outro.

## Alternativa: Pages CMS

https://app.pagescms.org — login com GitHub ou por e-mail (colaborador convidado). Configuração em `.pages.yml`.
