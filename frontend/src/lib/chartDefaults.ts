/**
 * Padrao global do ApexCharts.
 * `window.Apex` e mesclado em TODO grafico da aplicacao, entao cor, animacao
 * e interacao ficam definidas em um lugar so — nenhuma pagina precisa repetir.
 */
import { cssVar, chartPalette } from './themeColor';

declare global {
  interface Window { Apex?: Record<string, unknown> }
}

export function applyChartDefaults() {
  const p = chartPalette();
  const dark = document.body.classList.contains('dark');
  const grid = dark ? 'rgba(255,255,255,.08)' : 'rgba(9,10,11,.07)';
  const label = { colors: p.muted, fontSize: '12px', fontFamily: cssVar('--lf-font', 'Poppins, sans-serif') };

  window.Apex = {
    chart: {
      fontFamily: cssVar('--lf-font', 'Poppins, sans-serif'),
      foreColor: cssVar('--lf-text-body'),
      background: 'transparent',
      toolbar: { show: false },
      // entrada animada + transicao ao atualizar
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 650,
        animateGradually: { enabled: true, delay: 110 },
        dynamicAnimation: { enabled: true, speed: 380 },
      },
      dropShadow: {
        enabled: !dark,
        top: 4, left: 0, blur: 10, opacity: 0.12,
        color: p.primary,
      },
    },
    // paleta viva, vinda dos tokens
    colors: [p.primary, p.success, p.warning, p.danger, p.info, p.violet, p.pink],
    theme: { mode: dark ? 'dark' : 'light' },
    grid: {
      borderColor: grid,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 8 },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2.5, curve: 'smooth', lineCap: 'round' },
    // opacidade alta: o problema anterior era grafico lavado
    fill: { opacity: 0.92 },
    plotOptions: {
      bar: { borderRadius: 6, borderRadiusApplication: 'end', columnWidth: '55%' },
    },
    // realce no hover e escurecimento das demais series
    states: {
      hover: { filter: { type: 'lighten', value: 0.12 } },
      active: { filter: { type: 'darken', value: 0.12 } },
    },
    tooltip: {
      theme: dark ? 'dark' : 'light',
      style: { fontSize: '12px', fontFamily: cssVar('--lf-font', 'Poppins, sans-serif') },
      marker: { show: true },
      intersect: false,
      shared: true,
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'left',
      fontSize: '12px',
      markers: { radius: 4 },
      labels: { colors: p.muted },
      itemMargin: { horizontal: 10, vertical: 4 },
      onItemHover: { highlightDataSeries: true },
    },
    xaxis: {
      labels: { style: label },
      axisBorder: { show: false },
      axisTicks: { show: false },
      crosshairs: { stroke: { color: grid, dashArray: 4 } },
    },
    yaxis: { labels: { style: label } },
  };
}

/** Reaplica quando o tema claro/escuro muda e redesenha os graficos abertos. */
export function watchChartTheme() {
  applyChartDefaults();
  const observer = new MutationObserver(() => {
    applyChartDefaults();
    // forca o redesenho dos graficos ja montados com a paleta nova
    (window as any).ApexCharts?.exec?.('*', 'resetSeries');
    window.dispatchEvent(new Event('resize'));
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
