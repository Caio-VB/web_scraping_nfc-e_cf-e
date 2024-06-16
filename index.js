const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/consulta-nfce', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    await page.goto('https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/');

    // Espera até que os dados apareçam
    await page.waitForSelector('#totalNota', { timeout: 0 });

    const data = await page.evaluate(() => {
      const cleanText = (text) => text.replace(/[\n\t()]/g, '').trim();
      
      const cnpj = cleanText(document.querySelector('.txtCenter .text:nth-child(2)').innerText);
      const endereco = cleanText(document.querySelector('.txtCenter .text:nth-child(3)').innerText);
      const totalItems = cleanText(document.querySelector('#totalNota .totalNumb:nth-child(2)').innerText);
      const totalValue = cleanText(document.querySelector('#totalNota .totalNumb.txtMax').innerText);
      const items = [];
      
      document.querySelectorAll('#tabResult tr').forEach(item => {
        const description = cleanText(item.querySelector('.txtTit')?.innerText || '');
        const code = cleanText(item.querySelector('.RCod')?.innerText.replace('Código:', '') || '');
        const quantity = cleanText(item.querySelector('.Rqtd')?.innerText.replace('Qtde.:', '') || '');
        const unit = cleanText(item.querySelector('.RUN')?.innerText.replace('UN:', '') || '');
        const unitValue = cleanText(item.querySelector('.RvlUnit')?.innerText.replace('Vl. Unit.:', '') || '');
        const totalValue = cleanText(item.querySelector('.valor')?.innerText || '');

        if (description) {
          items.push({ description, code, quantity, unit, unitValue, totalValue });
        }
      });

      return { cnpj, endereco, totalItems, totalValue, items };
    });

    console.log('Dados da NFC-e:', data);
    await browser.close();
    res.send(`Dados da NFC-e capturados com sucesso: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('Erro ao capturar os dados da NFC-e:', error);
    res.status(500).send('Erro ao capturar os dados da NFC-e');
  }
});

app.get('/consulta-cfe', async (req, res) => {
  try {
    const browser = await puppeteer.launch({ 
      headless: false, 
      defaultViewport: null, 
      args: ['--ignore-certificate-errors'] 
    });
    const page = await browser.newPage();
    await page.goto('https://satsp.fazenda.sp.gov.br/COMSAT/Public/ConsultaPublica/ConsultaPublicaCfe.aspx', {
      waitUntil: 'networkidle2',
    });

    // Espera até que os dados apareçam
    await page.waitForSelector('#DadosEmitente1', { timeout: 0 });

    const data = await page.evaluate(() => {
      const cleanText = (text) => text.replace(/[\n\t]/g, '').trim();
      
      const cnpj = cleanText(document.querySelector('#conteudo_lblCnpjEmitente').innerText);
      const endereco = cleanText(document.querySelector('#conteudo_lblEnderecoEmintente').innerText);
      const totalValue = cleanText(document.querySelector('#conteudo_lblTotal').innerText);
      const items = [];
      
      document.querySelectorAll('#tableItens tbody tr').forEach((row, index) => {
        if (index % 2 === 0) {
          const cells = row.querySelectorAll('td');
          const item = {
            index: cleanText(cells[0].innerText),
            code: cleanText(cells[1].innerText),
            description: cleanText(cells[2].innerText),
            quantity: cleanText(cells[3].innerText),
            unit: cleanText(cells[4].innerText),
            unitValue: cleanText(cells[5].innerText),
            totalValue: cleanText(cells[7].innerText)
          };
          items.push(item);
        }
      });

      return { cnpj, endereco, totalValue, items };
    });

    console.log('Dados do CF-e:', data);
    await browser.close();
    res.send(`Dados do CF-e capturados com sucesso: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('Erro ao capturar os dados do CF-e:', error);
    res.status(500).send('Erro ao capturar os dados do CF-e');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
