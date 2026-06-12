export function showModal(title: string, content: HTMLElement, onConfirm?: () => boolean | void | Promise<boolean | void>): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `<h3 class="modal-title">${title}</h3>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => document.body.removeChild(overlay);
  header.appendChild(closeBtn);

  const body = document.createElement('div');
  body.className = 'modal-body';
  body.appendChild(content);

  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = '取消';
  cancelBtn.onclick = () => document.body.removeChild(overlay);

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-primary';
  confirmBtn.textContent = '确定';
  confirmBtn.onclick = async () => {
    if (!onConfirm) {
      document.body.removeChild(overlay);
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '处理中...';
      const result = await onConfirm();
      if (result !== false) {
        document.body.removeChild(overlay);
      } else {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '确定';
      }
    } catch (error) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '确定';
    }
  };

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };

  document.body.appendChild(overlay);

  return () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };
}

export function showAlert(message: string, type: 'error' | 'success' = 'error'): void {
  const container = document.createElement('div');
  container.className = `alert alert-${type}`;
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.left = '50%';
  container.style.transform = 'translateX(-50%)';
  container.style.zIndex = '2000';
  container.style.minWidth = '300px';
  container.style.textAlign = 'center';
  container.textContent = message;

  document.body.appendChild(container);

  setTimeout(() => {
    document.body.removeChild(container);
  }, 3000);
}
