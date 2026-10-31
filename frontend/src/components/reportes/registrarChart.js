import {
  ArcElement, BarElement, CategoryScale, Chart, Filler, LinearScale, LineElement, PointElement, Tooltip, Legend
} from 'chart.js';

// Chart.js se compone por piezas: solo se registran las que usan las cuatro gráficas del panel.
Chart.register(ArcElement, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip, Legend);
