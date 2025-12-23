import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MilestoneOption {
  value: string;
  label: string;
}

interface RowColors {
  planned: string;
  actual: string;
  plannedOpacity: number;
  actualOpacity: number;
  subSubtaskOpacity: number;
}

interface CategoryColors {
  dev: string;
  test: string;
  infra: string;
  support: string;
}

interface CategoryOpacity {
  dev: number;
  test: number;
  infra: number;
  support: number;
}

export const useConfig = () => {
  const [milestoneOptions, setMilestoneOptions] = useState<MilestoneOption[]>([
    { value: 'planned', label: 'PLANNED' },
    { value: 'closed', label: 'CLOSED' },
    { value: 'dev-complete', label: 'Dev Complete' },
    { value: 'dev-merge-done', label: 'Dev Merge Done' },
    { value: 'staging-merge-done', label: 'Staging Merge Done' },
    { value: 'prod-merge-done', label: 'Prod Merge Done' },
    { value: 'in-progress', label: 'In progress' }
  ]);

  const [rowColors, setRowColors] = useState<RowColors>({
    planned: '#fbdd2b',
    actual: '#1f3cd1',
    plannedOpacity: 0.2,
    actualOpacity: 0.2,
    subSubtaskOpacity: 0.15
  });

  const [categoryColors, setCategoryColors] = useState<CategoryColors>({
    dev: '#10b981',
    test: '#3b82f6',
    infra: '#eab308',
    support: '#f97316'
  });

  const [categoryOpacity, setCategoryOpacity] = useState<CategoryOpacity>({
    dev: 1.0,
    test: 1.0,
    infra: 1.0,
    support: 1.0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: milestoneData } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'milestone_options')
        .maybeSingle();

      const { data: colorData } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'row_colors')
        .maybeSingle();

      const { data: categoryColorData } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'category_colors')
        .maybeSingle();

      const { data: categoryOpacityData } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'category_opacity')
        .maybeSingle();

      if (milestoneData) {
        setMilestoneOptions(milestoneData.config_value as MilestoneOption[]);
      }

      if (colorData) {
        setRowColors(colorData.config_value as RowColors);
      }

      if (categoryColorData) {
        setCategoryColors(categoryColorData.config_value as CategoryColors);
      }

      if (categoryOpacityData) {
        setCategoryOpacity(categoryOpacityData.config_value as CategoryOpacity);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading config:', err);
      setLoading(false);
    }
  };

  return {
    milestoneOptions,
    rowColors,
    categoryColors,
    categoryOpacity,
    loading,
    refetch: loadConfig
  };
};
