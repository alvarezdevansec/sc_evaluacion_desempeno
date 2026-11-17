interface CountdownOverlayProps {
  countdown: number;
}

export default function CountdownOverlay({ countdown }: CountdownOverlayProps) {
  return (
    <div className="evaluation-overlay">
      <div className="countdown-modal">
        <div className="countdown-spinner">
          <div className="countdown-ring" />
          <span>{countdown}</span>
        </div>
        <h2>En un momento comienza la evaluación</h2>
        <p>Prepárese para comenzar...</p>
      </div>
    </div>
  );
}
