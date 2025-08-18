import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { ReduxProvider } from './store/Provider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error(
        "Root element with ID 'root' not found. Ensure your index.html contains <div id='root'></div>.",
    );
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <ReduxProvider>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </ReduxProvider>,
);
