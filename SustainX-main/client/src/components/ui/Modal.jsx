export default function Modal({ id, isOpen, onClose, title, children }) {
  return (
    <div
      className={`modal-overlay ${isOpen ? 'open' : ''}`}
      id={id}
      onClick={(e) => {
        if (e.target.classList.contains('modal-overlay')) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
