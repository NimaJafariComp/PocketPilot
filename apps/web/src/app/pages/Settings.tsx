import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Plus, Trash2, Download, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { services } from '../lib/services';

export function Settings() {
  const { categories, addCategory, transactions, budgets, goals, clearAllData } = useData();
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3B82F6' });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory(newCategory);
      setIsAddCategoryOpen(false);
      setNewCategory({ name: '', color: '#3B82F6' });
      toast.success('Category added successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add category');
    }
  };

  const handleExportData = async () => {
    const data = {
      transactions,
      budgets,
      goals,
      categories,
      exportedAt: new Date().toISOString(),
    };

    try {
      await services.dataExport.exportJson(
        `pocketpilot-export-${new Date().toISOString().split('T')[0]}.json`,
        data,
      );
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export data');
    }
  };

  const handleClearAllData = async () => {
    try {
      await clearAllData();
      toast.success('All data cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear data');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your categories, data, and privacy settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Manage your transaction categories</CardDescription>
            </div>
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name</Label>
                    <Input
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="e.g., Travel, Education"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        type="text"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Add Category
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {transactions.filter((t) => t.category === category.name).length} transactions
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download all your data in JSON format</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <CardTitle>Privacy & Data</CardTitle>
          </div>
          <CardDescription>
            Your financial data is stored in Firestore under your authenticated user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Data Storage</h4>
            <p className="text-sm text-blue-800">
              Your data is stored in your user-scoped Firestore collections and protected by Firebase Auth
              and Firestore security rules.
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-900 mb-2">Important Note</h4>
            <p className="text-sm text-orange-800">
              PocketPilot is not meant for collecting personally identifiable information (PII)
              or securing highly sensitive data. Always follow best practices for financial data security.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your transactions, budgets, goals, and settings.
                  This action cannot be undone. Consider exporting your data first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 hover:bg-red-700">
                  Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
