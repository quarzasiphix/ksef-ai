import { useQuery } from '@tanstack/react-query';
import { StorageService } from '@/shared/services/storageService';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import type { StorageFolderTreeNode } from '../types/storage';
import type { Department } from '@/shared/types';

interface FoldersByDepartment {
  departmentId: string | null;
  departmentName: string;
  departmentColor?: string;
  department?: Department;
  folders: StorageFolderTreeNode[];
}

/**
 * Hook to fetch folders grouped by department
 * Returns all departments with their folders for company-wide view
 */
export const useStorageFoldersByDepartment = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  const {
    data: foldersByDepartment = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['storage-folders-by-department', currentProfile?.id],
    queryFn: async () => {
      if (!currentProfile?.id) return [];

      // Fetch all folders (no department filter)
      const allFolders = await StorageService.getFolders(currentProfile.id);

      // Fetch all departments for this business profile
      const { data: departments } = await supabase
        .from('departments')
        .select('*')
        .eq('business_profile_id', currentProfile.id);

      const departmentMap = new Map<string, Department>();
      departments?.forEach(dept => {
        departmentMap.set(dept.id, dept);
      });

      // Group folders by department
      const foldersByDept = new Map<string | null, any[]>();
      
      allFolders.forEach(folder => {
        const deptId = folder.department_id || null;
        if (!foldersByDept.has(deptId)) {
          foldersByDept.set(deptId, []);
        }
        foldersByDept.get(deptId)!.push(folder);
      });

      // Helper to build folder tree (same logic as StorageService)
      const buildFolderTree = (folders: any[], parentId: string | null = null, level: number = 0): StorageFolderTreeNode[] => {
        return folders
          .filter(f => f.parent_folder_id === parentId)
          .map(folder => ({
            ...folder,
            level,
            children: buildFolderTree(folders, folder.id, level + 1),
          }));
      };

      // Build tree for each department
      const result: FoldersByDepartment[] = [];
      
      foldersByDept.forEach((folders, deptId) => {
        const tree = buildFolderTree(folders);
        const dept = deptId ? departmentMap.get(deptId) : undefined;
        
        result.push({
          departmentId: deptId,
          departmentName: dept?.name || 'Ogólne (cała firma)',
          departmentColor: dept?.color,
          department: dept,
          folders: tree,
        });
      });

      return result;
    },
    enabled: !!currentProfile?.id,
  });

  return {
    foldersByDepartment,
    isLoading,
    error,
  };
};
