import axios from 'axios';
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL;
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Table } from './ui/table';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface DataSourceSelectorProps {
  onSelectTable: (tableName: string) => void;
}

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ onSelectTable }) => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableSchema, setTableSchema] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: 'mysql',
    host: '',
    user: '',
    password: '',
    database: '',
  });
  const [gdriveUrl, setGdriveUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTables = async () => {
      const res = await axios.get('/tables');
      setTables(res.data);
    };
    fetchTables();
  }, []);

  const handleConnect = async () => {
    const resp = await axios.post('/connect', formData);
    if (resp.status === 200) {
      alert('Connected successfully!');
      const tableName = resp.data.tableName;
      setSelectedTable(tableName);
      const schemaResp = await axios.get(`/schema/${tableName}`);
      setTableSchema(schemaResp.data);
    }
  };

  const handleGoogleDriveSync = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true); // Keep loading state
      const resp = await axios.post('/gdrive-sync', { gdriveUrl }); // Remove googleApiKey
      if (resp.status === 200) {
        const tableName = resp.data.tableName;
        const schemaResp = await axios.get(`/schema/${tableName}`);
        setTableSchema(schemaResp.data);
        alert('Google Drive file synced successfully!');
      }
    } catch (error) {
      console.error('Error syncing Google Drive file:', error);
      alert('Failed to sync Google Drive file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (table: string) => {
    const resp = await axios.delete(`/table/${table}`);
    if (resp.status === 200) {
      alert('Table deleted successfully!');
      const res = await axios.get('/tables');
      setTables(res.data);
      setSelectedTable('');
      setTableSchema([]);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Data Source Configuration</h2>

      {/* Existing Tables */}
      <div className="mb-6">
        <Label htmlFor="existing-tables" className="block text-sm font-medium text-gray-700">
          Existing Tables
        </Label>
        <Select onValueChange={(value) => {
          setSelectedTable(value);
          onSelectTable(value);
        }} value={selectedTable}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a table" />
          </SelectTrigger>
          <SelectContent>
            {tables.map((table) => (
              <SelectItem key={table} value={table}>
                {table}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTable && (
          <Button variant="destructive" className="mt-2" onClick={() => handleDeleteTable(selectedTable)}>
            Delete Selected Table
          </Button>
        )}
      </div>

      {/* Connect to MySQL */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connect to MySQL</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="mysql-host">Host</Label>
            <Input id="mysql-host" value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mysql-user">User</Label>
            <Input id="mysql-user" value={formData.user} onChange={(e) => setFormData({ ...formData, user: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mysql-password">Password</Label>
            <Input id="mysql-password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mysql-database">Database</Label>
            <Input id="mysql-database" value={formData.database} onChange={(e) => setFormData({ ...formData, database: e.target.value })} />
          </div>
        </div>
        <Button onClick={handleConnect}>Connect to MySQL</Button>
      </div>

      {/* Google Drive Sync */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Sync from Google Drive (CSV)</h3>
        <form onSubmit={handleGoogleDriveSync}>
          <div className="mb-4">
            <Label htmlFor="gdrive-url">Google Drive Shareable Link (CSV)</Label>
            <Input id="gdrive-url" value={gdriveUrl} onChange={(e) => setGdriveUrl(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Syncing...' : 'Sync Google Drive File'}
          </Button>
        </form>
      </div>

      {/* Connect to Default SQLite */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Connect to Default SQLite</h3>
        <p className="mb-3">Connects to the local `data.sqlite` file.</p>
        <Button onClick={async () => {
          const dbConfig = { type: 'sqlite', path: 'data.sqlite' };
          try {
            await axios.post('/connect', dbConfig);
            alert('Connected to default SQLite successfully!');
            // Optionally refresh tables or schema
          } catch (error) {
            console.error('Error connecting to default SQLite:', error);
            alert('Failed to connect to default SQLite.');
          }
        }}>Connect to Default SQLite</Button>
      </div>

      {/* Table Schema Display */}
      {selectedTable && tableSchema.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Schema for {selectedTable}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column Name</TableHead>
                <TableHead>Data Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableSchema.map((col, index) => (
                <TableRow key={index}>
                  <TableCell>{col.name}</TableCell>
                  <TableCell>{col.type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;
