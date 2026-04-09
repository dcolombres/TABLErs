export class SuggestionService {
    /**
     * Generates a list of suggested chart configurations based on data analysis.
     */
    static suggestCharts(context) {
        const { columns, sampleData, tableName } = context;
        if (sampleData.length === 0)
            return [];
        const columnStats = this.analyzeColumns(columns, sampleData);
        const suggestions = [];
        // Rule 1: Temporal analysis (Evolution over time)
        const dateCol = columnStats.find(c => c.isDate);
        const metricCols = columnStats.filter(c => c.isNumeric && !c.isPotentialId);
        if (dateCol && metricCols.length > 0) {
            metricCols.slice(0, 2).forEach(metric => {
                suggestions.push({
                    id: `suggest_line_${dateCol.name}_${metric.name}`,
                    title: `Evolución de ${this.formatName(metric.name)} por ${this.formatName(dateCol.name)}`,
                    type: 'line',
                    dataSource: {
                        table: tableName,
                        xAxis: dateCol.name,
                        yAxis: metric.name,
                        aggregation: 'SUM'
                    },
                    filters: []
                });
            });
        }
        // Rule 2: Categorical analysis (Distribution)
        const catCols = columnStats.filter(c => c.isCategory && !c.isDate);
        if (catCols.length > 0 && metricCols.length > 0) {
            catCols.slice(0, 2).forEach(cat => {
                const metric = metricCols[0];
                // Suggest a Bar chart
                suggestions.push({
                    id: `suggest_bar_${cat.name}_${metric.name}`,
                    title: `${this.formatName(metric.name)} por ${this.formatName(cat.name)}`,
                    type: 'bar',
                    dataSource: {
                        table: tableName,
                        xAxis: cat.name,
                        yAxis: metric.name,
                        aggregation: 'SUM'
                    },
                    filters: []
                });
                // If very low cardinality, suggest a Pie chart
                if (cat.cardinality <= 6) {
                    suggestions.push({
                        id: `suggest_pie_${cat.name}_count`,
                        title: `Distribución de ${this.formatName(cat.name)}`,
                        type: 'pie',
                        dataSource: {
                            table: tableName,
                            xAxis: cat.name,
                            yAxis: cat.name,
                            aggregation: 'COUNT'
                        },
                        filters: []
                    });
                }
            });
        }
        // Rule 3: Top Metrics (Pure aggregation)
        if (metricCols.length > 0) {
            const topMetric = metricCols[0];
            suggestions.push({
                id: `suggest_table_top_${topMetric.name}`,
                title: `Resumen de ${this.formatName(topMetric.name)}`,
                type: 'table',
                dataSource: {
                    table: tableName,
                    xAxis: columns[0] || columns[1] || 'id',
                    yAxis: topMetric.name,
                    aggregation: 'SUM'
                },
                filters: []
            });
        }
        // Rule 4: Guaranteed Fallback (Simple Table View)
        if (suggestions.length === 0 && columns.length > 0) {
            suggestions.push({
                id: `suggest_fallback_table`,
                title: `Vista rápida de ${this.formatName(tableName)}`,
                type: 'table',
                dataSource: {
                    table: tableName,
                    xAxis: columns[0],
                    yAxis: columns[1] || columns[0],
                    aggregation: 'COUNT'
                },
                filters: []
            });
        }
        const result = suggestions.slice(0, 4); // Limit to top 4 suggestions
        console.log(`[SuggestionService] Generated ${result.length} suggestions for table ${tableName}`);
        return result;
    }
    static analyzeColumns(columns, data) {
        return columns.map(col => {
            const values = data.map(d => d[col]).filter(v => v !== null && v !== undefined);
            const uniqueValues = new Set(values);
            const cardinality = uniqueValues.size;
            const firstVal = values[0];
            const type = typeof firstVal;
            const isNumeric = type === 'number';
            const isDate = this.isDateColumn(col, values);
            const isPotentialId = col.toLowerCase().includes('id') || col.toLowerCase().endsWith('_id');
            const isCategory = !isNumeric && cardinality > 0 && cardinality <= 25; // Increased threshold
            return {
                name: col,
                type,
                cardinality,
                isNumeric,
                isDate,
                isCategory,
                isPotentialId
            };
        });
    }
    static isDateColumn(name, values) {
        const n = name.toLowerCase();
        const dateKeywords = ['fecha', 'date', 'created', 'mes', 'year', 'año', 'timestamp', 'periodo'];
        if (dateKeywords.some(k => n.includes(k))) {
            return true;
        }
        // Check first few values
        if (values.length > 0) {
            const v = String(values[0]);
            // Basic check for YYYY-MM-DD or similar
            if (v.match(/^\d{4}-\d{2}-\d{2}/) || v.match(/^\d{2}\/\d{2}\/\d{4}/))
                return true;
            const parsed = Date.parse(v);
            return !isNaN(parsed) && v.length >= 4 && (v.includes('-') || v.includes('/') || v.includes(':'));
        }
        return false;
    }
    static formatName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .trim()
            .replace(/^\w/, c => c.toUpperCase());
    }
}
