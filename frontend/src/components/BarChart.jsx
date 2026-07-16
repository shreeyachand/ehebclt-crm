import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function BarChart({ labels, values }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Count",
            data: values,
            backgroundColor: "var(--blue)"
          }
        ]
      }}
    />
  );
}
