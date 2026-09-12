# BGS Eskdalemuir - Induction Coil Magnetometer Source Investigation

**Fonte:** British Geological Survey (BGS) / NERC Environmental Data Service (EDS).
**URL:** https://geomag.bgs.ac.uk/ / Portal de dados do National Geoscience Data Centre (NGDC).
**Dataset:** High frequency (100Hz) induction coil magnetometer data from Eskdalemuir Observatory.
**Estação:** Eskdalemuir (ESK), UK.
**Instrumento:** Magnetômetro de Bobina de Indução (Induction Coil Magnetometer).
**Canais:** 3 componentes ortogonais vetoriais (H, D, Z ou X, Y, Z).
**Sample rate:** 100 Hz (frequência de Nyquist de 50 Hz, ideal para banda Schumann de 0-40 Hz).
**Unidades:** Dados brutos frequentemente em Volts (V) ou *Counts* do conversor A/D.
**Calibração:** Complexa. Diferente dos fluxgates, a voltagem de uma bobina de indução é proporcional à *derivada* do campo magnético ($V \propto dB/dt$). A calibração exige transformar os dados para o domínio da frequência via FFT, aplicar a Função de Transferência Instrumental complexa (Amplitude e Fase fornecidas em arquivos de metadados acessórios pelo BGS) e, em seguida, converter para picoTeslas ($pT$).
**Licença:** Open Government Licence (OGL) v3.0 (equivalente a CC-BY e compatível com uso comercial).
**Atribuição:** Exigida. Exemplo: *"Contains British Geological Survey materials © UKRI [Ano]"*.
**Acesso:** Bloqueado/Restrito (Requer registro/aprovação). Embora a licença seja aberta, o dataset massivo de alta frequência fica retido no portal do NERC EDS. Requer login com conta institucional (SAML/Academic) ou credenciais fornecidas após aprovação humana de formulário de solicitação de dados.
**Limitações:** Não existe uma API REST, endpoint OGC/SensorThings, FDSN-WS público aberto ou FTP anônimo que forneça os arquivos de indução magnética de 100 Hz diretamente sem sessão autenticada.
**Data da investigação:** 12 de Setembro de 2026.
**Conclusão:** Fonte cientificamente adequada, porém acesso automatizado não disponível neste momento.
