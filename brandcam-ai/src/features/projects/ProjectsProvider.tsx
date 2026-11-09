import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FilterId, Project, ProjectKind } from '../../lib/types';

const KEY = 'brandcam.projects.v1';

type NewProject = {
  kind: ProjectKind;
  /** Source file (already on disk). It is moved/copied into the project folder. */
  sourceUri: string;
  filterId: FilterId;
  filterBaked: boolean;
  durationSec?: number;
  /** true → move (recorder temp file), false → copy (user's library import). */
  move?: boolean;
};

type Ctx = {
  ready: boolean;
  projects: Project[];
  add: (p: NewProject) => Promise<Project>;
  remove: (id: string) => Promise<void>;
  get: (id: string) => Project | undefined;
  update: (id: string, patch: Partial<Project>) => Promise<void>;
};

const ProjectsContext = createContext<Ctx>({
  ready: false,
  projects: [],
  add: async () => {
    throw new Error('ProjectsProvider missing');
  },
  remove: async () => {},
  get: () => undefined,
  update: async () => {},
});

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const list = JSON.parse(raw) as Project[];
          // Drop entries whose file vanished (e.g. user cleared app data partially).
          setProjects(list.filter((p) => new File(p.mediaUri).exists));
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  const persist = useCallback(async (list: Project[]) => {
    setProjects(list);
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  }, []);

  const add = useCallback(
    async (np: NewProject) => {
      const id = newId();
      const dir = new Directory(Paths.document, 'projects', id);
      dir.create({ intermediates: true });
      const ext = np.sourceUri.split('.').pop()?.split('?')[0] || (np.kind === 'photo' ? 'jpg' : 'mp4');
      const dest = new File(dir, `original.${ext}`);
      const src = new File(np.sourceUri);
      if (np.move) src.move(dest);
      else src.copy(dest);
      let thumbUri: string | undefined;
      if (np.kind === 'video') {
        try {
          const t = await VideoThumbnails.getThumbnailAsync(dest.uri, { time: 0, quality: 0.7 });
          const thumb = new File(dir, 'thumb.jpg');
          new File(t.uri).move(thumb);
          thumbUri = thumb.uri;
        } catch {
          // A missing poster is cosmetic; the grid falls back to a play icon.
        }
      }
      const project: Project = {
        id,
        kind: np.kind,
        mediaUri: dest.uri,
        filterId: np.filterId,
        filterBaked: np.filterBaked,
        status: 'draft',
        durationSec: np.durationSec,
        thumbUri,
        createdAt: Date.now(),
      };
      setProjects((prev) => {
        const next = [project, ...prev];
        AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      return project;
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      const dir = new Directory(Paths.document, 'projects', id);
      if (dir.exists) dir.delete();
      await persist(projects.filter((p) => p.id !== id));
    },
    [persist, projects],
  );

  const get = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const update = useCallback(async (id: string, patch: Partial<Project>) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ready, projects, add, remove, get, update }), [ready, projects, add, remove, get, update]);
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export const useProjects = () => useContext(ProjectsContext);
