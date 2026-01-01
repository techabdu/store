import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { docsNavigation } from '../../data/docsNavigation';
import { useNotification } from '../../context/NotificationContext';

const Docs = () => {
    const { '*': splat } = useParams();
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showError } = useNotification();

    // Helper to find the correct file from the navigation tree based on path
    const findFileByPath = (items, targetPath) => {
        for (const item of items) {
            // Check if this item matches the path, handle both styles of paths if needed
            // targetPath usually comes in as "intro" or "user/pos"
            // config paths are "/intro" or "/user/pos"
            const configPath = item.path ? item.path.replace(/^\//, '') : '';

            if (configPath === targetPath) {
                return item.file;
            }
            if (item.children) {
                const found = findFileByPath(item.children, targetPath);
                if (found) return found;
            }
        }
        return null;
    };

    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            setError(null);

            try {
                // If splat is empty, default to introduction
                const currentPath = splat || 'intro';
                const fileName = findFileByPath(docsNavigation, currentPath);

                if (!fileName) {
                    throw new Error('Documentation page not found');
                }

                // Dynamic import of markdown files
                // Note: Vite needs to know about these files at build time
                // We use a glob import to get all md files in content directory
                const modules = import.meta.glob('../docs/content/**/*.md', { as: 'raw' });

                // Construct the full path key for the map
                const fullPath = `../docs/content/${fileName}`;

                if (modules[fullPath]) {
                    const markdown = await modules[fullPath]();
                    setContent(markdown);
                } else {
                    throw new Error(`File not found: ${fileName}`);
                }
            } catch (err) {
                console.error('Error loading docs:', err);
                showError('Unable to load documentation content.');
                setError(err.message);
                setContent('');
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [splat]);

    if (loading) {
        return <div className="docs-loading">Loading documentation...</div>;
    }

    if (error) {
        return (
            <div className="docs-error">
                <h1>404 - Page Not Found</h1>
                <p>We couldn't find the documentation page you're looking for.</p>
                <p className="error-detail">{error}</p>
                <a href="/docs" className="back-link">Return to Docs Home</a>
            </div>
        );
    }

    return (
        <div className="docs-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default Docs;
